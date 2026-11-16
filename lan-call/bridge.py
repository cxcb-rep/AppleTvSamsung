"""Forward an explicitly paired phone's camera and microphone to the TV."""

import argparse
import asyncio
import base64
import ipaddress
import logging
import secrets
import ssl
import time
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path

from aiohttp import WSMsgType, web
from qrcode import QRCode
from qrcode.image.svg import SvgPathImage

ROOT = Path(__file__).resolve().parent
LOG = logging.getLogger("apple-call")
VIDEO, AUDIO = 1, 2
MAX_FRAME = 80 * 1024
CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization",
}
HEADERS = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
}


def authorized(given, expected):
    return secrets.compare_digest(given.encode("utf-8"), expected.encode("utf-8"))


@dataclass
class Room:
    code: str
    receiver_key: str
    expires: float
    tv: web.WebSocketResponse | None = None
    phone: web.WebSocketResponse | None = None


class Bridge:
    def __init__(self, address, http_port, https_port, state):
        self.http_origin = f"http://{address}:{http_port}"
        self.https_origin = f"https://{address}:{https_port}"
        self.state = state
        self.key = (state / "receiver.key").read_text(encoding="ascii").strip()
        if len(self.key) < 32:
            raise ValueError("receiver.key must contain a random key of at least 32 characters")
        self.room = None

    def valid_room(self):
        room = self.room
        if room and time.monotonic() < room.expires:
            return room
        return None

    async def close_room(self, room):
        if self.room is room:
            self.room = None
        await asyncio.gather(*(ws.close() for ws in (room.tv, room.phone) if ws and not ws.closed))

    async def expire_rooms(self):
        while True:
            await asyncio.sleep(5)
            if self.room and not self.valid_room():
                await self.close_room(self.room)

    async def preflight(self, _request):
        return web.Response(status=204, headers=CORS)

    async def create_room(self, request):
        if not authorized(request.headers.get("Authorization", ""), f"Bearer {self.key}"):
            return web.Response(status=401, headers=CORS)
        previous = self.room
        room = Room(secrets.token_urlsafe(18), secrets.token_urlsafe(24), time.monotonic() + 300)
        self.room = room
        if previous:
            await self.close_room(previous)
        if self.room is not room:
            return web.Response(status=409, headers=CORS)
        url = f"{self.http_origin}/join#{room.code}"
        qr = QRCode(box_size=5, border=4, image_factory=SvgPathImage)
        qr.add_data(url)
        image = BytesIO()
        qr.make_image().save(image)
        LOG.info("Pairing opened on TV")
        return web.json_response({
            "url": url,
            "receiver": room.receiver_key,
            "qr": "data:image/svg+xml;base64," + base64.b64encode(image.getvalue()).decode("ascii"),
        }, headers={**HEADERS, **CORS})

    async def receive_tv(self, request):
        room = self.valid_room()
        if not room or not authorized(request.query.get("key", ""), room.receiver_key):
            raise web.HTTPUnauthorized()
        if room.tv is not None:
            raise web.HTTPConflict()
        socket = room.tv = web.WebSocketResponse(heartbeat=15, max_msg_size=256, compress=False)
        try:
            await socket.prepare(request)
            async for message in socket:
                if message.type == WSMsgType.TEXT and message.data == "end":
                    break
        finally:
            await self.close_room(room)
        return socket

    async def receive_phone(self, request):
        if request.headers.get("Origin") != self.https_origin:
            raise web.HTTPForbidden()
        room = self.valid_room()
        if not room or not room.tv or not authorized(request.query.get("code", ""), room.code):
            raise web.HTTPUnauthorized()
        if room.phone is not None:
            raise web.HTTPConflict()
        socket = room.phone = web.WebSocketResponse(heartbeat=15, max_msg_size=MAX_FRAME, compress=False)
        try:
            await socket.prepare(request)
            if self.room is not room or room.tv.closed:
                return socket
            room.expires = time.monotonic() + 7200
            await room.tv.send_str("connected")
            LOG.info("Phone joined local session")
            async for message in socket:
                if message.type != WSMsgType.BINARY:
                    continue
                data = message.data
                if not data or data[0] not in (VIDEO, AUDIO):
                    continue
                if data[0] == AUDIO and (len(data) < 3 or len(data) > 4097 or len(data) % 2 == 0):
                    continue
                try:
                    await asyncio.wait_for(room.tv.send_bytes(data), timeout=1)
                except (TimeoutError, ConnectionError):
                    break
        finally:
            await self.close_room(room)
        return socket

    def phone_page(self, name):
        async def serve(_request):
            return web.FileResponse(ROOT / name, headers=HEADERS)
        return serve

    async def join_page(self, _request):
        page = (ROOT / "join.html").read_text(encoding="utf-8")
        return web.Response(text=page.replace("__HTTPS_ORIGIN__", self.https_origin), content_type="text/html", headers=HEADERS)

    def apps(self):
        http = web.Application()
        http.add_routes([
            web.get("/join", self.join_page),
            web.get("/join.js", self.phone_page("join.js")),
            web.get("/phone.css", self.phone_page("phone.css")),
            web.get("/call.mobileconfig", self.certificate("call.mobileconfig", "application/x-apple-aspen-config")),
            web.get("/call-ca.cer", self.certificate("call-ca.cer", "application/x-x509-ca-cert")),
            web.post("/room", self.create_room),
            web.options("/room", self.preflight),
            web.get("/receiver", self.receive_tv),
        ])
        https = web.Application()
        https.add_routes([
            web.get("/phone", self.phone_page("phone.html")),
            web.get("/phone.js", self.phone_page("phone.js")),
            web.get("/phone.css", self.phone_page("phone.css")),
            web.get("/sender", self.receive_phone),
        ])
        return http, https

    def certificate(self, name, content_type):
        async def download(_request):
            return web.FileResponse(self.state / name, headers={
                **HEADERS, "Content-Type": content_type, "Content-Disposition": f'attachment; filename="{name}"'
            })
        return download


async def serve(args):
    bridge = Bridge(args.host, args.http_port, args.https_port, args.state)
    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls.load_cert_chain(args.state / "host.pem", args.state / "host-key.pem")
    http, https = bridge.apps()
    runners = [web.AppRunner(app, access_log=None) for app in (http, https)]
    expiry = asyncio.create_task(bridge.expire_rooms())
    try:
        for runner, port, context in zip(runners, (args.http_port, args.https_port), (None, tls)):
            await runner.setup()
            await web.TCPSite(runner, args.host, port, ssl_context=context).start()
        LOG.info("Listening on %s and %s", bridge.http_origin, bridge.https_origin)
        await asyncio.Event().wait()
    finally:
        expiry.cancel()
        if bridge.room:
            await bridge.close_room(bridge.room)
        await asyncio.gather(*[runner.cleanup() for runner in runners])


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", required=True, type=ipaddress.IPv4Address)
    parser.add_argument("--state", required=True, type=Path)
    parser.add_argument("--http-port", default=8771, type=int)
    parser.add_argument("--https-port", default=8772, type=int)
    options = parser.parse_args()
    if not options.host.is_private or options.host.is_unspecified:
        parser.error("--host must be a specific private LAN address")
    options.host = str(options.host)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    try:
        asyncio.run(serve(options))
    except KeyboardInterrupt:
        pass
