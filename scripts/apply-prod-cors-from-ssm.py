#!/usr/bin/env python3
"""Safely apply the exact production CORS allowlist from SSM to the running backend.

Changes only one existing systemd EnvironmentFile entry. No application secrets,
passwords, or environment contents are printed or sent back to GitHub Actions.
On restart/health failure, restore the original EnvironmentFile and restart.
"""
import os
import pathlib
import stat
import subprocess
import tempfile
import time
import urllib.request

SSM_KEY = "/broandbro/backend/prod/app/cors/allowedOrigins"
OLD = "https://migrate-prod.broandbro.in"
DESIRED = ",".join((OLD, "https://broandbro.in", "https://www.broandbro.in"))
CONFIG = pathlib.Path("/opt/broandbro/config/application.env")
PREFIX = "APP_CORS_ALLOWED_ORIGINS="


def systemd_escape(value: str) -> str:
    if any(char in value for char in ('\n', '\r', '"', '\\')):
        raise RuntimeError("Refusing an invalid CORS environment value")
    return f'{PREFIX}"{value}"'


def atomic_write(content: str, original_stat: os.stat_result) -> None:
    fd, tmp = tempfile.mkstemp(prefix=".application.env.cors-", dir=str(CONFIG.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
        os.chown(tmp, original_stat.st_uid, original_stat.st_gid)
        os.chmod(tmp, stat.S_IMODE(original_stat.st_mode))
        os.replace(tmp, CONFIG)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def wait_healthy() -> bool:
    for _ in range(45):
        try:
            with urllib.request.urlopen("http://127.0.0.1:8080/actuator/health", timeout=4) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(3)
    return False


def main() -> None:
    ssm_value = subprocess.run(
        ["aws", "ssm", "get-parameter", "--name", SSM_KEY, "--region", "ap-south-1",
         "--query", "Parameter.Value", "--output", "text"],
        capture_output=True, text=True, check=True
    ).stdout.strip()
    if ssm_value != DESIRED:
        raise RuntimeError("SSM CORS allowlist does not exactly match approved production origins")

    if CONFIG.is_symlink() or not CONFIG.is_file():
        raise RuntimeError("Expected a regular backend systemd environment file")
    original_stat = CONFIG.stat()
    original = CONFIG.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)
    matches = [i for i, line in enumerate(lines) if line.startswith(PREFIX)]
    if len(matches) != 1:
        raise RuntimeError("Expected exactly one backend CORS environment entry")

    current = lines[matches[0]].strip()
    if current not in (systemd_escape(OLD), systemd_escape(DESIRED)):
        raise RuntimeError("Refusing to overwrite an unrecognized existing CORS configuration")

    suffix = "\n" if lines[matches[0]].endswith("\n") else ""
    lines[matches[0]] = systemd_escape(DESIRED) + suffix
    updated = "".join(lines)
    changed = updated != original

    try:
        if changed:
            atomic_write(updated, original_stat)
        subprocess.run(["systemctl", "restart", "broandbro"], check=True)
        if not wait_healthy():
            raise RuntimeError("Backend health did not recover after CORS reload")
    except Exception:
        if changed:
            atomic_write(original, original_stat)
        subprocess.run(["systemctl", "restart", "broandbro"], check=False)
        raise

    print("Production CORS allowlist reloaded; backend health HTTP 200")


if __name__ == "__main__":
    main()
