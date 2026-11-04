#!/usr/bin/env python3
"""Cross-account S3 media migration using two independent AWS SSO profiles.

DRY RUN by default. Uses local temporary files, preserving useful HTTP metadata,
object tags, and SHA-256 verification of destination bytes. Existing\nobjects are never silently skipped; verification downloads add read traffic. No credentials or object
payloads are written to GitHub, Terraform state, or the log.

Install: python3 -m pip install boto3
Example:
  python3 scripts/migrate-s3-media.py --source-profile old --target-profile new \\
    --environment dev --target-account-id 123456789012
  python3 scripts/migrate-s3-media.py --source-profile old --target-profile new \\
    --environment dev --target-account-id 123456789012 --execute
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlencode

import boto3
from botocore.exceptions import ClientError

SOURCE_BUCKETS = {
    "dev": {
        "media": "broandbro-dev-root-bucket",
        "location": "broandbro-location-images-dev",
    },
    "prod": {
        "media": "broandbro-prod-root-bucket",
        "location": "broandbro-location-images-prod",
    },
}
PRESERVE = {
    "ContentType", "CacheControl", "ContentDisposition",
    "ContentEncoding", "ContentLanguage", "Expires",
}
MIGRATION_HASH_KEY = "migration-sha256"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-profile", required=True)
    p.add_argument("--target-profile", required=True)
    p.add_argument("--environment", choices=("dev", "prod"), required=True)
    p.add_argument("--target-account-id", required=True)
    p.add_argument("--region", default="us-east-1")
    p.add_argument("--execute", action="store_true",
                   help="Perform writes; otherwise list counts and mappings only")
    p.add_argument("--overwrite", action="store_true",
                   help="Explicitly replace objects already present in target")
    p.add_argument("--manifest", type=Path,
                   help="Write nonsecret bucket mapping JSON to this local file")
    return p.parse_args()


def account_id(session: boto3.Session) -> str:
    return session.client("sts").get_caller_identity()["Account"]


def iter_objects(client, bucket: str):
    pages = client.get_paginator("list_objects_v2")
    for page in pages.paginate(Bucket=bucket):
        for item in page.get("Contents", []):
            key = item["Key"]
            if not key.endswith("/") and not key.startswith("deploy/"):
                yield key, item["Size"]


def sha256_file(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def verify_target_object(target, bucket: str, key: str, checksum: str, size: int) -> None:
    """Verify actual destination bytes, not merely caller-written S3 metadata."""
    response = target.get_object(Bucket=bucket, Key=key)
    digest = hashlib.sha256()
    count = 0
    body = response["Body"]
    try:
        for block in body.iter_chunks(chunk_size=8 * 1024 * 1024):
            if block:
                digest.update(block)
                count += len(block)
    finally:
        body.close()
    if count != size or digest.hexdigest() != checksum:
        raise RuntimeError("Destination object content differs from source SHA-256")


def sorted_tags(tags):
    return sorted((item["Key"], item["Value"]) for item in tags)


def migrate_object(source, target, source_bucket: str, target_bucket: str,
                   key: str, size: int, *, overwrite: bool) -> str:
    existing = None
    try:
        existing = target.head_object(Bucket=target_bucket, Key=key)
    except ClientError as exc:
        code = str(exc.response.get("Error", {}).get("Code", ""))
        if code not in ("404", "NoSuchKey", "NotFound"):
            raise

    head = source.head_object(Bucket=source_bucket, Key=key)
    if head.get("ContentLength") != size:
        raise RuntimeError("Source object size changed during enumeration; freeze writes and retry")
    metadata = dict(head.get("Metadata") or {})
    fd, temp_name = tempfile.mkstemp(prefix="broandbro-migrate-")
    os.close(fd)
    try:
        # Downloads a single object at a time; local temp files are mode 0600.
        source.download_file(source_bucket, key, temp_name)
        if os.stat(temp_name).st_size != size:
            raise RuntimeError("Source object changed while migrating; retry after writes are frozen")
        checksum = sha256_file(temp_name)
        latest = source.head_object(Bucket=source_bucket, Key=key)
        if (latest.get("ETag") != head.get("ETag")
                or latest.get("VersionId") != head.get("VersionId")
                or latest.get("ContentLength") != head.get("ContentLength")):
            raise RuntimeError("Source object changed during download; freeze writes and retry")

        source_tags = source.get_object_tagging(
            Bucket=source_bucket, Key=key).get("TagSet", [])
        if existing is not None and not overwrite:
            # Never consider a same-key target safely migrated without
            # validating the original source checksum and the actual S3 bytes.
            if (existing.get("ContentLength") != size
                    or existing.get("Metadata", {}).get(MIGRATION_HASH_KEY) != checksum):
                raise RuntimeError(
                    "Existing target object is not proven identical; refuse to skip. "
                    "Inspect it, then explicitly use --overwrite if safe")
            verify_target_object(target, target_bucket, key, checksum, size)
            target_tags = target.get_object_tagging(
                Bucket=target_bucket, Key=key).get("TagSet", [])
            if sorted_tags(target_tags) != sorted_tags(source_tags):
                raise RuntimeError(
                    "Existing object tags differ; inspect and explicitly use --overwrite")
            return "exists"

        metadata[MIGRATION_HASH_KEY] = checksum
        extra = {field: head[field] for field in PRESERVE if head.get(field) is not None}
        extra["Metadata"] = metadata
        target.upload_file(temp_name, target_bucket, key, ExtraArgs=extra)
        if source_tags:
            target.put_object_tagging(
                Bucket=target_bucket, Key=key, Tagging={"TagSet": source_tags})
        verified = target.head_object(Bucket=target_bucket, Key=key)
        if (verified.get("ContentLength") != size
                or verified.get("Metadata", {}).get(MIGRATION_HASH_KEY) != checksum):
            raise RuntimeError("Destination object metadata/size verification failed")
        verify_target_object(target, target_bucket, key, checksum, size)
        return "copied"
    finally:
        Path(temp_name).unlink(missing_ok=True)

def main() -> None:
    args = parse_args()
    if not args.target_account_id.isdigit() or len(args.target_account_id) != 12:
        raise SystemExit("Invalid 12-digit target account ID")
    if args.source_profile == args.target_profile:
        raise SystemExit("Source and destination profiles must differ")

    old = boto3.Session(profile_name=args.source_profile, region_name=args.region)
    new = boto3.Session(profile_name=args.target_profile, region_name=args.region)
    old_id, new_id = account_id(old), account_id(new)
    if old_id == new_id or new_id != args.target_account_id:
        raise SystemExit("Refusing: source and target accounts must differ, target ID must match")

    source, target = old.client("s3"), new.client("s3")
    mapping = {
        "media": {
            "source": SOURCE_BUCKETS[args.environment]["media"],
            "target": f"broandbro-{args.environment}-media-{new_id}",
        },
        "location": {
            "source": SOURCE_BUCKETS[args.environment]["location"],
            "target": f"broandbro-{args.environment}-locations-{new_id}",
        },
    }
    print(f"Source account: {old_id}, target account: {new_id}, region: {args.region}")
    print(f"Mode: {'EXECUTE' if args.execute else 'DRY RUN'}")
    totals = {"objects": 0, "bytes": 0, "copied": 0, "exists": 0}
    for purpose, pair in mapping.items():
        src, dst = pair["source"], pair["target"]
        print(f"{purpose}: {src} -> {dst}")
        if args.execute:
            # Ensure target Terraform created it. Do not create buckets here.
            target.head_bucket(Bucket=dst)
        count = total_size = copied = exists = 0
        for key, size in iter_objects(source, src):
            count += 1
            total_size += size
            if args.execute:
                result = migrate_object(source, target, src, dst, key, size,
                                        overwrite=args.overwrite)
                if result == "copied":
                    copied += 1
                else:
                    exists += 1
        print(f"  {count} objects, {total_size} bytes; copied={copied}, existing={exists}")
        totals["objects"] += count
        totals["bytes"] += total_size
        totals["copied"] += copied
        totals["exists"] += exists
    if args.manifest:
        args.manifest.write_text(
            json.dumps({"environment": args.environment, "mapping": mapping,
                        "results": totals}, indent=2) + "\n", encoding="utf-8")
        print(f"Manifest written to {args.manifest} (contains bucket names, no secrets)")
    print("NEXT: verify URLs stored in PostgreSQL and perform final delta copy after write freeze.")
    print("Do not delete source objects or modify live database references in this step.")


if __name__ == "__main__":
    main()
