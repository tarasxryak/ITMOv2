import http.client
import json
import tempfile
import threading
import unittest
from pathlib import Path

from serve import create_server


class FakeCartClient:
    def __init__(self, link: str | None = None, error: Exception | None = None):
        self.link = link
        self.error = error
        self.calls = []

    def cart_link(self, xml_ids: list[int]) -> str:
        self.calls.append(xml_ids)
        if self.error:
            raise self.error
        return self.link


class ServeTestCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        root = Path(tmp.name)
        self.dist = root / "dist"
        (self.dist / "assets").mkdir(parents=True)
        (self.dist / "index.html").write_text("<!doctype html><title>Looksmax Grocery</title>", encoding="utf-8")
        (self.dist / "assets" / "app.js").write_text("console.log('игра')", encoding="utf-8")
        (self.dist / "catalog.json").write_text('[{"id": 1}]', encoding="utf-8")
        (self.dist / "pic.webp").write_bytes(b"RIFF....WEBP")
        (root / "secret.txt").write_text("не отдавать", encoding="utf-8")
        self.client = FakeCartClient(link="https://vkusvill.ru/?share_basket=1")
        self.start(self.dist)

    def start(self, static_dir: Path):
        self.server = create_server(self.client, static_dir, port=0)
        # poll_interval по умолчанию 0.5 с: shutdown() в каждом тесте ждал бы его целиком.
        threading.Thread(target=self.server.serve_forever, kwargs={"poll_interval": 0.01}, daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)

    def request(self, method: str, path: str, body: bytes | str | None = None, headers: dict | None = None):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=5)
        if isinstance(body, str):
            body = body.encode("utf-8")
        conn.request(method, path, body=body, headers=headers or {})
        response = conn.getresponse()
        data = response.read()
        conn.close()
        return response, data

    def post_cart(self, payload) -> tuple[int, dict]:
        body = payload if isinstance(payload, (str, bytes)) else json.dumps(payload)
        response, data = self.request("POST", "/api/cart", body, {"Content-Type": "application/json"})
        return response.status, json.loads(data)


class StaticFilesTest(ServeTestCase):
    def test_root_serves_index_html(self):
        response, data = self.request("GET", "/")
        self.assertEqual(response.status, 200)
        self.assertEqual(response.getheader("Content-Type"), "text/html; charset=utf-8")
        self.assertIn("Looksmax Grocery", data.decode("utf-8"))

    def test_assets_have_their_mime_types(self):
        response, data = self.request("GET", "/assets/app.js")
        self.assertEqual(response.status, 200)
        self.assertEqual(response.getheader("Content-Type"), "text/javascript; charset=utf-8")
        self.assertEqual(data.decode("utf-8"), "console.log('игра')")
        self.assertEqual(self.request("GET", "/catalog.json")[0].getheader("Content-Type"), "application/json; charset=utf-8")
        self.assertEqual(self.request("GET", "/pic.webp")[0].getheader("Content-Type"), "image/webp")

    def test_query_string_is_ignored(self):
        self.assertEqual(self.request("GET", "/?utm=1")[0].status, 200)

    def test_missing_file_is_404(self):
        self.assertEqual(self.request("GET", "/nope.js")[0].status, 404)

    def test_cannot_escape_static_dir(self):
        for path in ("/../secret.txt", "/%2e%2e/secret.txt", "/assets/../../secret.txt"):
            response, data = self.request("GET", path)
            self.assertEqual(response.status, 404, path)
            self.assertNotIn("не отдавать", data.decode("utf-8"), path)

    def test_hint_when_frontend_is_not_built(self):
        self.start(self.dist / "missing")
        response, data = self.request("GET", "/")
        self.assertEqual(response.status, 503)
        self.assertIn("npm run build", data.decode("utf-8"))


class CartProxyTest(ServeTestCase):
    def test_returns_link_for_xml_ids(self):
        status, body = self.post_cart({"xml_ids": [27695, 81955]})
        self.assertEqual((status, body), (200, {"link": "https://vkusvill.ru/?share_basket=1"}))
        self.assertEqual(self.client.calls, [[27695, 81955]])

    def test_rejects_bad_requests_with_explanation(self):
        bad = [
            {"xml_ids": []},
            {},
            {"xml_ids": "27695"},
            {"xml_ids": ["27695"]},
            {"xml_ids": [0]},
            {"xml_ids": [True]},
            {"xml_ids": list(range(1, 52))},
        ]
        for payload in bad:
            status, body = self.post_cart(payload)
            self.assertEqual(status, 400, payload)
            self.assertIn("error", body)
            self.assertTrue(body["error"], payload)
        self.assertEqual(self.client.calls, [])

    def test_rejects_non_json_body(self):
        status, body = self.post_cart("это не json")
        self.assertEqual(status, 400)
        self.assertIn("JSON", body["error"])

    def test_vkusvill_refusal_becomes_502_with_its_text(self):
        self.client.error = ValueError("ВкусВилл вернул ошибку vkusvill_cart_link_create: товар недоступен")
        status, body = self.post_cart({"xml_ids": [1]})
        self.assertEqual(status, 502)
        self.assertIn("товар недоступен", body["error"])

    def test_network_failure_becomes_502_with_plain_message(self):
        self.client.error = OSError("tunnel failed")
        status, body = self.post_cart({"xml_ids": [1]})
        self.assertEqual(status, 502)
        self.assertIn("ВкусВилл", body["error"])
        self.assertNotIn("tunnel", body["error"])

    def test_malformed_vkusvill_answer_becomes_502_with_plain_message(self):
        self.client.error = KeyError("link")
        status, body = self.post_cart({"xml_ids": [1]})
        self.assertEqual(status, 502)
        self.assertIn("непонятный ответ", body["error"])

    def test_get_on_cart_is_405(self):
        response, data = self.request("GET", "/api/cart")
        self.assertEqual(response.status, 405)
        self.assertIn("error", json.loads(data))


if __name__ == "__main__":
    unittest.main()
