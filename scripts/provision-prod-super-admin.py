#!/usr/bin/env python3
"""One-time production provisioning. SSM receives only encrypted credentials."""
import base64
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time
import urllib.request

ACCOUNT = "098859530205"

def aws(*args):
    p = subprocess.run(["aws", *args, "--region", "ap-south-1", "--output", "json"],
                       capture_output=True, check=True, text=True)
    return json.loads(p.stdout)

def main():
    raw = os.environ.pop("SUPER_ADMIN_PHONE", "").strip()
    password = os.environ.pop("SUPER_ADMIN_PASSWORD", "")
    m = re.fullmatch(r"(?:\+91|91|0)?([6-9][0-9]{9})", re.sub(r"[\s()-]", "", raw))
    if not m or len(password) < 12 or len(password.encode()) > 72 or any(c in password for c in "\r\n\0"):
        raise RuntimeError("Invalid phone or password policy; use an Indian mobile and 12–72 UTF-8 bytes.")
    phone = m.group(1)
    if os.environ.get("GITHUB_REF") != "refs/heads/main" or os.environ.get("EXPECTED_ACCOUNT") != ACCOUNT:
        raise RuntimeError("Unexpected deployment target.")
    if aws("sts", "get-caller-identity")["Account"] != ACCOUNT:
        raise RuntimeError("AWS account mismatch.")
    records = aws("ec2", "describe-instances", "--filters",
                  "Name=tag:Name,Values=broandbro-prod-backend",
                  "Name=instance-state-name,Values=running")
    ids = [i["InstanceId"] for r in records["Reservations"] for i in r["Instances"]]
    if len(ids) != 1 or not re.fullmatch(r"i-[0-9a-f]+", ids[0]):
        raise RuntimeError("Expected exactly one production EC2.")
    instance = ids[0]

    def remote(command):
        cid = aws("ssm", "send-command", "--instance-ids", instance,
                  "--document-name", "AWS-RunShellScript",
                  "--parameters", json.dumps({"commands": [command]}),
                  "--timeout-seconds", "180",
                  "--comment", "BroBro one-time super-admin provisioning")["Command"]["CommandId"]
        for _ in range(65):
            try:
                result = aws("ssm", "get-command-invocation", "--command-id", cid, "--instance-id", instance)
            except subprocess.CalledProcessError:
                time.sleep(3)
                continue
            status = result["Status"]
            if status == "Success":
                return result["StandardOutputContent"]
            if status in ("Failed", "TimedOut", "Cancelled", "Cancelling"):
                # Never print remote stderr or command data.
                if "Account collision" in result.get("StandardErrorContent", ""):
                    raise RuntimeError("Phone already belongs to an account with different credentials or role.")
                raise RuntimeError("Production provisioning command failed.")
            time.sleep(3)
        raise RuntimeError("Production provisioning command timed out.")

    run = os.environ["GITHUB_RUN_ID"] + "-" + os.environ["GITHUB_RUN_ATTEMPT"]
    if not re.fullmatch(r"[0-9]+-[0-9]+", run):
        raise RuntimeError("Invalid run identifier.")
    directory = "/run/brobro-super-admin-" + run
    key = directory + "/key.pem"
    try:
        pem = remote("set -eu; umask 077; mkdir -m 700 " + directory +
                     "; openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out " + key +
                     " 2>/dev/null; openssl pkey -in " + key + " -pubout")
        if not re.fullmatch(r"-----BEGIN PUBLIC KEY-----\n[A-Za-z0-9+/=\n]+-----END PUBLIC KEY-----\s*", pem):
            raise RuntimeError("Invalid ephemeral public key.")
        with tempfile.TemporaryDirectory() as tmp:
            public_key = Path(tmp) / "public.pem"
            public_key.write_text(pem)
            subprocess.run(["javac", "--release", "21", "-d", tmp, "scripts/ProvisionSuperAdmin.java"], check=True)
            encrypted = subprocess.run(["openssl", "pkeyutl", "-encrypt", "-pubin",
                       "-inkey", str(public_key), "-pkeyopt", "rsa_padding_mode:oaep",
                       "-pkeyopt", "rsa_oaep_md:sha256"], input=(phone + "\n" + password + "\n").encode(),
                       capture_output=True, check=True).stdout
            binary = base64.b64encode((Path(tmp) / "ProvisionSuperAdmin.class").read_bytes()).decode()
        ciphertext = base64.b64encode(encrypted).decode()
        remote_python = """
import json, os, subprocess, sys, zipfile
from pathlib import Path
d = Path(sys.argv[1])
def aws(*args):
    return json.loads(subprocess.run(['aws', *args, '--region','ap-south-1','--output','json'],
        capture_output=True,check=True,text=True).stdout)
def param(name):
    return aws('ssm','get-parameter','--name','/broandbro/backend/prod/'+name,
               '--with-decryption')['Parameter']['Value']
try:
    if aws('sts','get-caller-identity')['Account'] != '098859530205':
        raise RuntimeError()
    env = os.environ.copy()
    env['DB_URL'] = param('database/url')
    env['DB_USER'] = param('database/username')
    env['DB_PASSWORD'] = json.loads(aws('secretsmanager','get-secret-value',
                                       '--secret-id',param('database/secretArn'))['SecretString'])['password']
    if not env['DB_URL'].startswith('jdbc:postgresql:') or not env['DB_PASSWORD']:
        raise RuntimeError()
    with zipfile.ZipFile('/opt/broandbro/app.jar') as z:
        for name in z.namelist():
            if name.startswith('BOOT-INF/lib/') and name.endswith('.jar'):
                base = name.rsplit('/',1)[-1]
                if base.startswith(('postgresql-', 'spring-security-crypto-', 'spring-jcl-', 'commons-logging-')):
                    (d / base).write_bytes(z.read(name))
    plain = subprocess.run(['openssl','pkeyutl','-decrypt','-inkey',str(d/'key.pem'),
                 '-pkeyopt','rsa_padding_mode:oaep','-pkeyopt','rsa_oaep_md:sha256'],
                 input=(d/'payload').read_bytes(),capture_output=True,check=True).stdout
    subprocess.run(['java','-cp',str(d)+':'+str(d/'*'),'ProvisionSuperAdmin'],
                   env=env,input=plain,check=True)
except Exception as e:
    print('Provisioning helper failed: '+type(e).__name__,file=sys.stderr)
    sys.exit(1)
"""
        script64 = base64.b64encode(remote_python.encode()).decode()
        command = ("set -eu; umask 077; cd " + directory +
                   "; trap 'rm -rf -- " + directory + "' EXIT; " +
                   "printf %s '" + binary + "' | base64 -d > ProvisionSuperAdmin.class; " +
                   "printf %s '" + ciphertext + "' | base64 -d > payload; " +
                   "printf %s '" + script64 + "' | base64 -d > provision.py; " +
                   "python3 provision.py " + directory)
        result = remote(command)
        if "New super admin and zero-balance wallet created." in result:
            print("Production account created.")
        elif "Existing super admin already matches; no changes made." in result:
            print("Existing matching super admin verified; no database changes.")
        else:
            raise RuntimeError("Missing provisioning confirmation.")
    finally:
        try:
            remote("rm -rf -- " + directory)
        except Exception:
            print("Warning: ephemeral key cleanup could not be confirmed.")

    # Verify through the same API origin configured for the current production frontend.
    # No response bodies, credentials or bearer tokens are printed.
    base = "https://migrate-prod-api.broandbro.in"
    request = urllib.request.Request(base + "/auth/login",
              data=json.dumps({"phone": phone, "password": password}).encode(),
              headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        login = json.load(response)
    if login.get("user", {}).get("role") != "SUPER_ADMIN" or not login.get("token"):
        raise RuntimeError("API did not confirm super-admin login.")
    request = urllib.request.Request(base + "/auth/me",
             headers={"Authorization": "Bearer " + login["token"]})
    with urllib.request.urlopen(request, timeout=20) as response:
        profile = json.load(response)
    if profile.get("role") != "SUPER_ADMIN" or profile.get("isSuperUser") is not True:
        raise RuntimeError("API did not confirm super-admin access.")
    print("Production login and authenticated SUPER_ADMIN profile verified.")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Only controlled messages, never raw AWS/HTTP/JDBC errors.
        print(str(exc) if type(exc) is RuntimeError else "Provisioning failed: " + type(exc).__name__)
        raise SystemExit(1)
