#!/usr/bin/env python3
"""Offline cross-account S3 media integrity checks (no real AWS calls)."""
import importlib.util
import io
import pathlib
import tempfile
import unittest

from botocore.exceptions import ClientError

spec=importlib.util.spec_from_file_location(
    "migrate_s3_media",pathlib.Path(__file__).resolve().with_name("migrate-s3-media.py"))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ResponseBody:
    def __init__(self, content):
        self.content=content
        self.closed=False

    def iter_chunks(self, chunk_size):
        yield self.content

    def close(self):
        self.closed=True


class FakeS3:
    def __init__(self, objects=None):
        self.objects=objects or {}
        self.tags={}

    def head_object(self, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({"Error":{"Code":"404","Message":"Not Found"}},"HeadObject")
        data=self.objects[Key]
        return {"ContentLength":len(data), "ETag":"\"stable\"",
                "Metadata":self.meta.get(Key,{}) if hasattr(self,"meta") else {},
                "ContentType":"image/png"}

    def download_file(self, bucket, key, filename):
        pathlib.Path(filename).write_bytes(self.objects[key])

    def upload_file(self, filename, bucket, key, ExtraArgs):
        self.objects[key]=pathlib.Path(filename).read_bytes()
        if not hasattr(self,"meta"): self.meta={}
        self.meta[key]=ExtraArgs["Metadata"]

    def get_object(self, Bucket, Key):
        return {"Body":ResponseBody(self.objects[Key])}

    def get_object_tagging(self, Bucket, Key):
        return {"TagSet":self.tags.get(Key,[])}

    def put_object_tagging(self, Bucket, Key, Tagging):
        self.tags[Key]=Tagging["TagSet"]


class MediaMigrationTest(unittest.TestCase):
    def test_copy_and_verify_real_target_bytes(self):
        src=FakeS3({"photo.png":b"original data"})
        target=FakeS3()
        self.assertEqual(mod.migrate_object(src,target,"old","new","photo.png",13,overwrite=False),
                         "copied")
        self.assertEqual(mod.migrate_object(src,target,"old","new","photo.png",13,overwrite=False),
                         "exists")

    def test_same_key_different_bytes_is_not_silently_skipped(self):
        src=FakeS3({"photo.png":b"original data"})
        target=FakeS3({"photo.png":b"malicious data"})
        with self.assertRaisesRegex(RuntimeError, "not proven identical"):
            mod.migrate_object(src,target,"old","new","photo.png",13,overwrite=False)
        self.assertEqual(target.objects["photo.png"],b"malicious data")

    def test_corrupted_content_detected_even_with_matching_metadata(self):
        src=FakeS3({"photo.png":b"original data"})
        target=FakeS3()
        mod.migrate_object(src,target,"old","new","photo.png",13,overwrite=False)
        target.objects["photo.png"]=b"corruptd data"
        with self.assertRaisesRegex(RuntimeError, "content differs"):
            mod.migrate_object(src,target,"old","new","photo.png",13,overwrite=False)


if __name__ == "__main__":
    unittest.main()
