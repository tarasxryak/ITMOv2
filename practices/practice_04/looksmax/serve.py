"""Локальный сервер игры: раздаёт web/dist и проксирует POST /api/cart во ВкусВилл.

Браузер не может вызвать mcp.vkusvill.ru напрямую (CORS-preflight получает 401), поэтому корзину собирает
этот сервер. Только стандартная библиотека. Запуск: .venv/bin/python serve.py [--port 8765]
"""
import argparse
import json
import mimetypes
import posixpath
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Protocol
from urllib.parse import unquote, urlsplit

from core.vkusvill import VkusVillClient

PORT = 8765
STATIC_DIR = Path(__file__).resolve().parent / "web" / "dist"
MAX_CART_ITEMS = 50
MAX_BODY_BYTES = 8192
BUILD_HINT = "Фронтенд не собран. Выполни: cd web && npm ci && npm run build — и обнови страницу."

_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".txt": "text/plain",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
}
_TEXT_TYPES = {"text/html", "text/javascript", "text/css", "application/json", "image/svg+xml", "text/plain"}


class CartClient(Protocol):
    def cart_link(self, xml_ids: list[int]) -> str: ...


def content_type(path: Path) -> str:
    kind = _TYPES.get(path.suffix.lower()) or mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    return f"{kind}; charset=utf-8" if kind in _TEXT_TYPES else kind


def parse_xml_ids(body: bytes) -> list[int]:
    """Тело POST /api/cart → список xml_id. Непригодное тело — ValueError с пояснением."""
    try:
        data = json.loads(body)
    except ValueError:
        raise ValueError("тело запроса должно быть JSON вида {\"xml_ids\": [27695, 81955]}") from None
    xml_ids = data.get("xml_ids") if isinstance(data, dict) else None
    if not isinstance(xml_ids, list) or not xml_ids:
        raise ValueError("xml_ids должен быть непустым списком id товаров")
    if len(xml_ids) > MAX_CART_ITEMS:
        raise ValueError(f"xml_ids: не больше {MAX_CART_ITEMS} товаров, передано {len(xml_ids)}")
    if not all(type(i) is int and i > 0 for i in xml_ids):
        raise ValueError("xml_ids: каждый id — целое число больше нуля")
    return xml_ids


def create_server(client: CartClient, static_dir: Path, host: str = "127.0.0.1", port: int = PORT) -> ThreadingHTTPServer:
    static_root = static_dir.resolve()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _send(self, status: int, body: bytes, kind: str, extra: dict | None = None):
            self.send_response(status)
            self.send_header("Content-Type", kind)
            self.send_header("Content-Length", str(len(body)))
            for name, value in (extra or {}).items():
                self.send_header(name, value)
            self.end_headers()
            self.wfile.write(body)

        def _json(self, status: int, payload: dict, extra: dict | None = None):
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self._send(status, body, "application/json; charset=utf-8", extra)

        def _text(self, status: int, text: str):
            self._send(status, text.encode("utf-8"), "text/plain; charset=utf-8")

        def _static_file(self, url_path: str) -> Path | None:
            relative = posixpath.normpath(url_path).lstrip("/")
            candidate = (static_root / (relative or "index.html")).resolve()
            if static_root not in candidate.parents or not candidate.is_file():
                return None
            return candidate

        def do_GET(self):
            url_path = unquote(urlsplit(self.path).path)
            if url_path == "/api/cart":
                return self._json(405, {"error": "корзина собирается через POST /api/cart"}, {"Allow": "POST"})
            file = self._static_file(url_path)
            if file is None:
                if url_path == "/" and not (static_root / "index.html").is_file():
                    return self._text(503, BUILD_HINT)
                return self._text(404, "Не найдено")
            cache = "public, max-age=31536000, immutable" if url_path.startswith("/assets/") else "no-cache"
            self._send(200, file.read_bytes(), content_type(file), {"Cache-Control": cache})

        def do_POST(self):
            if urlsplit(self.path).path != "/api/cart":
                return self._json(404, {"error": "такого адреса нет: корзина собирается через POST /api/cart"})
            length = int(self.headers.get("Content-Length") or 0)
            if length > MAX_BODY_BYTES:
                return self._json(413, {"error": f"тело запроса больше {MAX_BODY_BYTES} байт"})
            try:
                xml_ids = parse_xml_ids(self.rfile.read(length))
            except ValueError as error:
                return self._json(400, {"error": str(error)})
            try:
                link = client.cart_link(xml_ids)
            except (KeyError, TypeError):
                return self._json(502, {"error": "ВкусВилл прислал непонятный ответ, попробуй ещё раз"})
            except ValueError as error:
                return self._json(502, {"error": str(error)})
            except OSError:
                return self._json(502, {"error": "Не получилось связаться с ВкусВиллом. Проверь интернет и попробуй ещё раз."})
            self._json(200, {"link": link})

    return ThreadingHTTPServer((host, port), Handler)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--dir", type=Path, default=STATIC_DIR, help="папка со сборкой фронтенда")
    args = parser.parse_args()
    server = create_server(VkusVillClient(), args.dir, port=args.port)
    if not (args.dir / "index.html").is_file():
        print(BUILD_HINT)
    print(f"Looksmax Grocery: http://127.0.0.1:{server.server_address[1]}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
