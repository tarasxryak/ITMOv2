import json
import threading
import unittest
from functools import partial
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from core.vkusvill import VkusVillClient, http_transport

FIXTURES = Path(__file__).parent / "fixtures"


def load(fixture: str) -> dict:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))


def rpc_result(text: str, is_error: bool = False) -> dict:
    # Конверт как в реальном ответе https://mcp.vkusvill.ru/mcp на tools/call
    return {
        "jsonrpc": "2.0",
        "id": 1,
        "result": {"content": [{"type": "text", "text": text}], "isError": is_error},
    }


class FakeTransport:
    def __init__(self, response: dict):
        self.response = response
        self.payloads = []

    def __call__(self, payload: dict) -> dict:
        self.payloads.append(payload)
        return self.response


def client_answering(fixture: str) -> tuple[VkusVillClient, FakeTransport]:
    transport = FakeTransport(rpc_result(json.dumps(load(fixture), ensure_ascii=False)))
    return VkusVillClient(transport), transport


class SearchTest(unittest.TestCase):
    def test_calls_search_tool_in_full_mode(self):
        client, transport = client_answering("search_tvorog.json")
        client.search("творог", 5)
        self.assertEqual(
            transport.payloads,
            [
                {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "tools/call",
                    "params": {
                        "name": "vkusvill_products_search",
                        "arguments": {"q": "творог", "limit": 5, "mode": "full"},
                    },
                }
            ],
        )

    def test_returns_found_items(self):
        client, _ = client_answering("search_tvorog.json")
        items = client.search("творог", 5)
        self.assertEqual([i["id"] for i in items], [27695, 185, 21347, 24165, 188])
        self.assertIn("properties", items[0])


class ProductDetailsTest(unittest.TestCase):
    def test_calls_details_tool_with_id(self):
        client, transport = client_answering("details_27695.json")
        client.product_details(27695)
        self.assertEqual(transport.payloads[0]["method"], "tools/call")
        self.assertEqual(
            transport.payloads[0]["params"],
            {"name": "vkusvill_product_details", "arguments": {"id": 27695}},
        )

    def test_returns_product(self):
        client, _ = client_answering("details_27695.json")
        product = client.product_details(27695)
        self.assertEqual(product["id"], 27695)
        self.assertEqual(product["name"], "Творог 5%, 180&nbsp;г")

    def test_unknown_product_raises_value_error_with_vkusvill_message(self):
        # реальный ответ на id 999999999: ok=false
        client, _ = client_answering("details_999999999.json")
        with self.assertRaisesRegex(ValueError, "Некорректный id товара"):
            client.product_details(999999999)


class CartLinkTest(unittest.TestCase):
    def test_puts_one_piece_of_each_product(self):
        client, transport = client_answering("cart_link_27695.json")
        client.cart_link([27695, 81955])
        self.assertEqual(
            transport.payloads[0]["params"],
            {
                "name": "vkusvill_cart_link_create",
                "arguments": {"products": [{"xml_id": 27695, "q": 1}, {"xml_id": 81955, "q": 1}]},
            },
        )

    def test_returns_link(self):
        client, _ = client_answering("cart_link_27695.json")
        self.assertEqual(client.cart_link([27695]), "https://vkusvill.ru/?share_basket=2276979561")

    def test_empty_cart_raises_value_error(self):
        client, transport = client_answering("cart_link_27695.json")
        with self.assertRaises(ValueError):
            client.cart_link([])
        self.assertEqual(transport.payloads, [])


class ErrorResponseTest(unittest.TestCase):
    def test_tool_error_raises_value_error_with_its_text(self):
        transport = FakeTransport(rpc_result("Сервис временно недоступен", is_error=True))
        with self.assertRaisesRegex(ValueError, "Сервис временно недоступен"):
            VkusVillClient(transport).product_details(27695)

    def test_json_rpc_error_raises_value_error_with_its_message(self):
        # реальный ответ на product_details с id=0
        transport = FakeTransport(load("rpc_error_details_id_0.json"))
        with self.assertRaisesRegex(ValueError, "greater than or equal to 1"):
            VkusVillClient(transport).product_details(0)


class _EchoHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers["Content-Length"]))
        self.server.seen.append((dict(self.headers), json.loads(body)))
        answer = json.dumps(rpc_result('{"ok": true, "data": {"link": "x"}}')).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(answer)))
        self.end_headers()
        self.wfile.write(answer)

    def log_message(self, *args):
        pass


class HttpTransportTest(unittest.TestCase):
    def setUp(self):
        self.server = HTTPServer(("127.0.0.1", 0), _EchoHandler)
        self.server.seen = []
        threading.Thread(target=self.server.serve_forever, args=(0.01,), daemon=True).start()
        self.addCleanup(self.server.server_close)
        self.addCleanup(self.server.shutdown)
        self.url = f"http://127.0.0.1:{self.server.server_port}/mcp"

    def test_posts_json_payload_and_parses_answer(self):
        payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {}}
        answer = http_transport(payload, url=self.url)
        self.assertEqual(answer["result"]["content"][0]["text"], '{"ok": true, "data": {"link": "x"}}')
        headers, body = self.server.seen[0]
        self.assertEqual(body, payload)
        self.assertEqual(headers["Content-Type"], "application/json")

    def test_sends_own_user_agent(self):
        # QRATOR перед mcp.vkusvill.ru отвечает 403 на User-Agent «Python-urllib/…»
        http_transport({"jsonrpc": "2.0"}, url=self.url)
        headers, _ = self.server.seen[0]
        self.assertFalse(headers["User-Agent"].startswith("Python-urllib"))

    def test_client_works_over_http(self):
        client = VkusVillClient(partial(http_transport, url=self.url))
        self.assertEqual(client.cart_link([27695]), "x")


if __name__ == "__main__":
    unittest.main()
