"""Create the local HTTPS identity and output the TV connection settings."""

import argparse
import ipaddress
import json
import os
import plistlib
import secrets
import subprocess
import tempfile
import uuid
from pathlib import Path


def provision(host, http_port, state, openssl):
    state.mkdir(parents=True, exist_ok=True)
    state = state.resolve()
    tls_files = ["host.pem", "host-key.pem", "call-ca.cer", "call.mobileconfig"]
    if not all((state / name).exists() for name in tls_files) or not (state / "host.txt").exists() or (state / "host.txt").read_text() != host:
        with tempfile.TemporaryDirectory(dir=state) as directory:
            temp = Path(directory)
            def run(*args):
                subprocess.run([openssl, *args], cwd=temp, check=True, stdout=subprocess.DEVNULL)

            (temp / "server.ext").write_text(
                "basicConstraints=critical,CA:FALSE\n"
                "keyUsage=critical,digitalSignature,keyEncipherment\n"
                "extendedKeyUsage=serverAuth\n"
                f"subjectAltName=IP:{host}\n",
                encoding="ascii",
            )
            run("req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256",
                "-days", "365", "-subj", "/CN=AppleTvSamsung Local Call",
                "-addext", "basicConstraints=critical,CA:TRUE,pathlen:0",
                "-addext", "keyUsage=critical,keyCertSign,cRLSign",
                "-keyout", "root-key.pem", "-out", "root.pem")
            run("req", "-new", "-newkey", "rsa:2048", "-nodes",
                "-subj", f"/CN={host}", "-keyout", "host-key.pem", "-out", "host.csr")
            run("x509", "-req", "-in", "host.csr", "-CA", "root.pem", "-CAkey", "root-key.pem",
                "-CAcreateserial", "-out", "host.pem", "-days", "365", "-sha256", "-extfile", "server.ext")
            run("x509", "-in", "root.pem", "-outform", "DER", "-out", "call-ca.cer")
            identity = "org.appletvsamsung.lan-call." + uuid.uuid4().hex
            (temp / "call.mobileconfig").write_bytes(plistlib.dumps({
                "PayloadType": "Configuration",
                "PayloadIdentifier": identity,
                "PayloadUUID": str(uuid.uuid4()),
                "PayloadVersion": 1,
                "PayloadDisplayName": "AppleTvSamsung Local Call",
                "PayloadContent": [{
                    "PayloadType": "com.apple.security.root",
                    "PayloadIdentifier": identity + ".certificate",
                    "PayloadUUID": str(uuid.uuid4()),
                    "PayloadVersion": 1,
                    "PayloadDisplayName": "AppleTvSamsung Local Call",
                    "PayloadCertificateFileName": "call-ca.cer",
                    "PayloadContent": (temp / "call-ca.cer").read_bytes(),
                }],
            }))
            for name in tls_files:
                os.replace(temp / name, state / name)
        (state / "host.txt").write_text(host, encoding="ascii")

    key_path = state / "receiver.key"
    if not key_path.exists():
        key_path.write_text(secrets.token_urlsafe(32), encoding="ascii")
    receiver = json.dumps({
        "origin": f"http://{host}:{http_port}",
        "key": key_path.read_text(encoding="ascii").strip(),
    })
    (state / "call-config.js").write_text(f"window.appleTvSamsungCall = {receiver};\n", encoding="ascii")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True, type=ipaddress.IPv4Address)
    parser.add_argument("--state", required=True, type=Path)
    parser.add_argument("--http-port", default=8771, type=int)
    parser.add_argument("--openssl", default="openssl")
    options = parser.parse_args()
    if not options.host.is_private or options.host.is_unspecified:
        parser.error("--host must be a specific private LAN address")
    provision(str(options.host), options.http_port, options.state, options.openssl)
