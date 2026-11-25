#!/usr/bin/env python3
"""Correct frontend-vhost webmanifest MIME with backups and verification.

Only touches known new-account static Nginx vhosts. Preserves certbot TLS edits,
API reverse proxy, DNS and service configuration. Restores both files on failure.
"""
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

TARGETS = {
    Path("/etc/nginx/conf.d/broandbro-main-cutover.conf"):
        r"broandbro\.in[ \t]+www\.broandbro\.in",
    Path("/etc/nginx/conf.d/broandbro-frontend.conf"):
        r"migrate-prod\.broandbro\.in",
}
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
        if "content-type: application/manifest+json" not in result.stdout.lower():
            raise RuntimeError(f"{host}: still serving manifest with wrong MIME type")
        print(f"{host}: manifest MIME verified")


def main():
    originals = {}
    changed = {}
    backups = []
    try:
        for path, host_re in TARGETS.items():
            original = path.read_text()
            originals[path] = original
            if "location = /manifest.webmanifest" in original:
                print(f"{path}: location already present, verifying")
                continue
            pattern = re.compile(r"(?m)^([ \t]*)server_name[ \t]+" + host_re + r"[ \t]*;[ \t]*$")
            matches = list(pattern.finditer(original))
            if not 1 <= len(matches) <= 2:
                raise RuntimeError(f"{path}: expected 1-2 known frontend vhosts; got {len(matches)}")
            def install(match):
                indent = match.group(1)
                location = (
                    f"\n{indent}location = /manifest.webmanifest {{\n"
                    f"{indent}    types {{ application/manifest+json webmanifest; }}\n"
                    f"{indent}    default_type application/manifest+json;\n"
                    f"{indent}    try_files $uri =404;\n"
                    f"{indent}}}\n"
                )
                return match.group(0) + location
            updated = pattern.sub(install, original)
            fd, backup = tempfile.mkstemp(prefix="brobro-pwa-vhost.", dir="/tmp")
            os.close(fd)
            shutil.copy2(path, backup)
            backups.append(backup)
            fd, staged = tempfile.mkstemp(prefix=".brobro-pwa-vhost.", dir=str(path.parent))
            try:
                with os.fdopen(fd, "w") as out:
                    out.write(updated)
                shutil.copymode(path, staged)
                os.replace(staged, path)
            finally:
                if os.path.exists(staged):
                    os.unlink(staged)
            changed[path] = backup
        checked("nginx", "-t")
        if changed:
            checked("systemctl", "reload", "nginx")
        smoke()
        print("PWA virtual-host MIME repair: PASS")
    except Exception:
        print("PWA MIME verification failed: restoring original vhost files")
        for path, backup in changed.items():
            shutil.copy2(backup, path)
        checked("nginx", "-t")
        if changed:
            checked("systemctl", "reload", "nginx")
        raise
    finally:
        for backup in backups:
            os.unlink(backup)


if __name__ == "__main__":
    main()
