"""Run a production container, restore its DB/uploads, then verify restored API bytes."""
import argparse
import json
import os
import secrets
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from http.client import HTTPException
from pathlib import Path
from data_backup import backup, restore


def docker(*args):
    return subprocess.check_output(["docker", *args], text=True, stderr=subprocess.STDOUT).strip()


def request(base, path, data=None, token=None, content_type="application/json"):
    headers = {"Content-Type": content_type}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if isinstance(data, dict) else data
    with urllib.request.urlopen(urllib.request.Request(base + path, data=body, headers=headers), timeout=10) as response:
        return response.read()


def run(image):
    containers = []
    with tempfile.TemporaryDirectory(prefix="tfrench-staging-") as directory:
        root = Path(directory)
        data = root / "data"
        data.mkdir()
        data.chmod(0o777)
        email = "staging-" + uuid.uuid4().hex + "@example.test"
        password = secrets.token_urlsafe(24)
        env = root / "container.env"
        env.write_text("\n".join([
            "ASPNETCORE_ENVIRONMENT=Production",
            "Jwt__Key=" + secrets.token_urlsafe(48),
            "BootstrapAdmin__Email=" + email,
            "BootstrapAdmin__Password=" + password,
        ]), encoding="utf-8")
        env.chmod(0o600)

        def start(storage):
            name = "tfrench-staging-" + uuid.uuid4().hex[:12]
            containers.append(name)
            docker("run", "-d", "--name", name, "--env-file", str(env), "--mount",
                   f"type=bind,source={storage},target=/data", "-p", "127.0.0.1::8080", image)
            port = docker("port", name, "8080/tcp").rsplit(":", 1)[1]
            base = "http://127.0.0.1:" + port
            end = time.monotonic() + 60
            while time.monotonic() < end:
                try:
                    if json.loads(request(base, "/health"))["status"] == "healthy":
                        return name, base
                except (urllib.error.URLError, TimeoutError, ConnectionError, HTTPException):
                    time.sleep(0.25)
            raise RuntimeError("Production container failed to become healthy")

        try:
            name, base = start(data)
            token = json.loads(request(base, "/api/auth/login", {"email": email, "password": password}))["token"]
            assert b"<app-root" in request(base, "/")
            assert b"<app-root" in request(base, "/dashboard/learning")
            try:
                request(base, "/api/not-a-real-endpoint")
                raise AssertionError("Unknown API must be 404")
            except urllib.error.HTTPError as error:
                assert error.code == 404
            try:
                request(base, "/api/auth/login", {"email": "admin@tfrench.vn", "password": "Admin@123"})
                raise AssertionError("Production must not contain seeded demo accounts")
            except urllib.error.HTTPError as error:
                assert error.code == 401
            payload = b"Staging restore proof: original file bytes."
            boundary = uuid.uuid4().hex
            multipart = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"restore-proof.txt\"\r\nContent-Type: text/plain\r\n\r\n".encode()
                         + payload + f"\r\n--{boundary}--\r\n".encode())
            file = json.loads(request(base, "/api/files", multipart, token, "multipart/form-data; boundary=" + boundary))
            resource = json.loads(request(base, "/api/resources", {"title": "Restore proof", "isPublic": True, "fileId": file["id"]}, token))
            assert request(base, "/api/files/" + file["publicId"], token=token) == payload
            docker("stop", name)
            bundle = root / "backup"
            result = backup(data / "tfrench.db", data / "uploads", bundle, service_stopped=True)
            restored = root / "restored"
            restore(bundle, restored)
            restored.chmod(0o777)
            # This is synthetic, isolated fixture data owned by the test runner.
            # Linux bind mounts must let the image's non-root UID write SQLite.
            for path in restored.rglob("*"):
                path.chmod(0o777 if path.is_dir() else 0o666)
            _, base = start(restored)
            token = json.loads(request(base, "/api/auth/login", {"email": email, "password": password}))["token"]
            assert request(base, "/api/files/" + file["publicId"], token=token) == payload
            rows = json.loads(request(base, "/api/resources", token=token))
            assert any(r["id"] == resource["id"] for r in rows)
            print(json.dumps({"production_smoke": "passed", "restored_api_file_bytes": "identical", **result}))
        finally:
            for name in containers:
                subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
            if os.name == "posix":
                # Only this TemporaryDirectory contains synthetic smoke data.
                # Upload directories belong to the application's non-root UID;
                # return them to the host runner after every writer has stopped
                # so TemporaryDirectory can remove them on Linux, even on failure.
                docker("run", "--rm", "--network", "none", "--user", "0:0",
                       "--mount", f"type=bind,source={root},target=/fixture",
                       "--entrypoint", "chown", image, "-R",
                       f"{os.getuid()}:{os.getgid()}", "/fixture")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--image", default="tfrench-staging:local")
    run(parser.parse_args().image)
