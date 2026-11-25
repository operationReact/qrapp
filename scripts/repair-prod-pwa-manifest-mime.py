#!/usr/bin/env python3
"""One-time idempotent Nginx MIME repair with rollback, no DNS/certificate edits."""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

MIME = Path("/etc/nginx/mime.types")
CORRECT = re.compile(r"(?m)^\s*application/manifest\+json\s+[^;\n]*\bwebmanifest\b[^;\n]*;")
ANY_MAPPING = re.compile(r"(?m)^\s*[^#\n;]+\bwebmanifest\b[^;\n]*;")
INSERT_AT = re.compile(r"(?m)^[ \t]*types[ \t]*\{[ \t]*\n")
HOSTS = ("broandbro.in", "www.broandbro.in", "migrate-prod.broandbro.in")


def checked(*args):
    return subprocess.run(args, capture_output=True, text=True, check=True)


def smoke():
    checked("nginx", "-t")
    for host in HOSTS:
        result = checked(
            "curl", "--noproxy", "*", "-fsS", "--max-time", "15",
            "--resolve", f"{host}:443:127.0.0.1",
            "-D", "-", "-o", "/dev/null",
            f"https://{host}/manifest.webmanifest",
        )
        headers = result.stdout.lower()
        if "content-type: application/manifest+json" not in headers:
            raise RuntimeError(f"{host}: expected application/manifest+json (not octet-stream)")
        print(f"{host} manifest Content-Type: application/manifest+json")


def main():
    before = MIME.read_text()
    if CORRECT.search(before):
        print("MIME extension already configured; running HTTPS smoke checks")
        smoke()
        return
    if ANY_MAPPING.search(before):
        raise RuntimeError("Unexpected webmanifest MIME mapping; manual review required")
    matches = list(INSERT_AT.finditer(before))
    if len(matches) != 1:
        raise RuntimeError("Refusing to modify nonstandard /etc/nginx/mime.types layout")
    mark = matches[0].end()
    after = before[:mark] + "    application/manifest+json          webmanifest;\n" + before[mark:]
    fd, backup = tempfile.mkstemp(prefix="brobro-nginx-mime.", dir="/tmp")
    os.close(fd)
    shutil.copy2(MIME, backup)
    fd, staging = tempfile.mkstemp(prefix=".brobro-mime.", dir=str(MIME.parent))
    try:
        with os.fdopen(fd, "w") as out:
            out.write(after)
        shutil.copymode(MIME, staging)
        os.replace(staging, MIME)
        try:
            checked("nginx", "-t")
            checked("systemctl", "reload", "nginx")
            smoke()
            print("Manifest MIME repair applied, HTTPS smoke verified")
        except Exception:
            print("Verification failed: restoring previous Nginx mime.types")
            shutil.copy2(backup, MIME)
            checked("nginx", "-t")
            checked("systemctl", "reload", "nginx")
            raise
    finally:
        if os.path.exists(staging):
            os.unlink(staging)
        os.unlink(backup)


if __name__ == "__main__":
    main()
