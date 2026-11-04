#!/usr/bin/env python3
"""Executed as root through AWS Systems Manager on EC2.
Deployment artifacts contain only this script and a JAR, never secrets.
"""
import json
import os
import pathlib
import re
import shutil
import socket
import subprocess
import sys
import time
import urllib.request

def aws(*args):
    result = subprocess.run(["aws", *args, "--region", "us-east-1", "--output", "json"],
                            check=True, capture_output=True, text=True)
    return json.loads(result.stdout)

def parameter(name, required=False):
    try:
        value = aws("ssm", "get-parameter", "--name", name, "--with-decryption")["Parameter"]["Value"]
    except subprocess.CalledProcessError:
        if required:
            raise RuntimeError("Required configuration parameter absent: " + name)
        return ""
    if value in ("", "None", "MISSING_EXTERNAL_CREDENTIAL"):
        if required:
            raise RuntimeError("Required configuration parameter unset: " + name)
        return ""
    return value

def main():
    if len(sys.argv) != 3:
        raise RuntimeError("Usage: deploy-backend-from-ssm.py dev|prod s3://.../app.jar")
    env, jar_uri = sys.argv[1:]
    if env not in ("dev", "prod"):
        raise RuntimeError("Invalid environment")
    account = aws("sts", "get-caller-identity")["Account"]
    allowed = rf"s3://broandbro-{env}-artifacts-{account}/deploy/{env}/[0-9]+/app[.]jar"
    if not re.fullmatch(allowed, jar_uri):
        raise RuntimeError("Deployment artifact does not belong to target AWS account/environment")

    base = f"/broandbro/backend/{env}/"
    def get(key, required=False):
        return parameter(base + key, required=required)

    url = get("database/url", True)
    user = get("database/username", True)
    secret_arn = get("database/secretArn", True)
    secret = json.loads(aws("secretsmanager", "get-secret-value",
                            "--secret-id", secret_arn)["SecretString"])
    api_hostname = get("app/api/domain", True)
    if not re.fullmatch(r"[a-zA-Z0-9.-]+", api_hostname):
        raise RuntimeError("Unexpected API hostname")
    password = secret["password"]
    if not password:
        raise RuntimeError("RDS managed credential is empty")
    values = {
        "SPRING_PROFILES_ACTIVE": env,
        "SERVER_PORT": "8080",
        "SPRING_DATASOURCE_URL": url,
        "SPRING_DATASOURCE_USERNAME": user,
        "SPRING_DATASOURCE_PASSWORD": password,
        "AWS_S3_BUCKET_NAME": get("aws/s3/bucketName", True),
        "AWS_S3_LOCATION_BUCKET_NAME": get("aws/s3/locationBucketName", True),
        "AWS_S3_REGION": get("aws/s3/region", True),
        "AWS_S3_ENABLED": get("aws/s3/enabled", True),
        "APP_CORS_ALLOWED_ORIGINS": get("app/cors/allowedOrigins", True),
        "OPENAI_API_KEY": get("openai/apiKey"),
        "RAZORPAY_KEY": get("razorpay/key"),
        "RAZORPAY_SECRET": get("razorpay/secret"),
        "RAZORPAY_WEBHOOK_SECRET": get("razorpay/webhookSecret"),
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN": get("whatsapp/webhookVerifyToken"),
        "WHATSAPP_APP_SECRET": get("whatsapp/appSecret"),
        "WHATSAPP_PHONE_NUMBER_ID": get("whatsapp/phoneNumberId"),
        "WHATSAPP_ACCESS_TOKEN": get("whatsapp/accessToken"),
    }
    if env == "prod":
        keys = ["RAZORPAY_KEY", "RAZORPAY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
                "WHATSAPP_WEBHOOK_VERIFY_TOKEN", "WHATSAPP_APP_SECRET",
                "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN"]
        for key in keys:
            if values[key] in ("", "None", "MISSING_EXTERNAL_CREDENTIAL"):
                raise RuntimeError("Missing mandatory production credential: " + key)

    app = pathlib.Path("/opt/broandbro")
    config = app / "config/application.env"
    temporary = app / "config/application.env.new"
    new_jar = app / "app.jar.new"
    subprocess.run(["aws", "s3", "cp", jar_uri, str(new_jar),
                    "--region", "us-east-1", "--only-show-errors"], check=True)
    shutil.chown(new_jar, user="broandbro", group="broandbro")
    new_jar.chmod(0o640)

    with temporary.open("w", encoding="utf-8") as stream:
        for key, value in values.items():
            if "\n" in value or "\r" in value:
                raise RuntimeError("Newline forbidden in systemd environment value: " + key)
            escaped = value.replace("\\", "\\\\").replace('"', '\\"')
            stream.write(f'{key}="{escaped}"\n')
    shutil.chown(temporary, user="broandbro", group="broandbro")
    temporary.chmod(0o640)

    previous = app / "app.jar.previous"
    previous_config = app / "config/application.env.previous"
    has_previous_jar = (app / "app.jar").is_file()
    has_previous_config = config.is_file()
    if has_previous_jar:
        shutil.copy2(app / "app.jar", previous)
    if has_previous_config:
        shutil.copy2(config, previous_config)
        previous_config.chmod(0o640)

    os.replace(temporary, config)
    os.replace(new_jar, app / "app.jar")

    try:
        subprocess.run(["systemctl", "restart", "broandbro"], check=True)
        for _ in range(48):
            try:
                with urllib.request.urlopen(
                    "http://127.0.0.1:8080/api/payment/config", timeout=4
                ) as response:
                    if response.status == 200:
                        print("Backend HTTP health check passed")
                        # Provision HTTPS only once the public A record points here.
                        # This avoids ACME failures while the old DNS account is authoritative.
                        endpoint = parameter(f"/broandbro/{env}/ec2-public-ip", True)
                        try:
                            resolved = {row[4][0] for row in socket.getaddrinfo(api_hostname, 443, type=socket.SOCK_STREAM)}
                        except OSError:
                            resolved = set()
                        cert_path = pathlib.Path("/etc/letsencrypt/live") / api_hostname / "fullchain.pem"
                        if not cert_path.is_file() and endpoint in resolved:
                            subprocess.run([
                                "certbot", "--nginx", "-d", api_hostname,
                                "--email", "admin@broandbro.in", "--agree-tos",
                                "--no-eff-email", "--non-interactive", "--redirect"
                            ], check=True)
                            print("HTTPS certificate provisioned for " + api_hostname)
                        elif not cert_path.is_file():
                            print("HTTPS deferred until preview API DNS points to this EC2 IP")
                        return
            except Exception:
                pass
            time.sleep(5)
        raise RuntimeError("Backend failed its local HTTP health check")
    except Exception:
        # Application credentials are part of the release. Roll back JAR AND
        # environment file together to avoid restarting old code with new config.
        print("Deployment failed; restoring last-known-good JAR and configuration", file=sys.stderr)
        if has_previous_jar and previous.exists():
            shutil.copy2(previous, app / "app.jar")
        if has_previous_config and previous_config.exists():
            shutil.copy2(previous_config, config)
            config.chmod(0o640)
        if has_previous_jar:
            subprocess.run(["systemctl", "restart", "broandbro"], check=False)
        raise

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        # Do not print command-line AWS output or credential values.
        print(f"Deployment failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
