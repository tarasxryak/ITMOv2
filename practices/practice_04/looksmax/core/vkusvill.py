import json
import urllib.request
from typing import Callable

MCP_URL = "https://mcp.vkusvill.ru/mcp"
# QRATOR перед mcp.vkusvill.ru отвечает 403 на User-Agent «Python-urllib/…».
_USER_AGENT = "looksmax-grocery/1.0"

Transport = Callable[[dict], dict]


def http_transport(payload: dict, url: str = MCP_URL) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "User-Agent": _USER_AGENT,
        },
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


class VkusVillClient:
    def __init__(self, transport: Transport = http_transport):
        self._transport = transport

    def search(self, q: str, limit: int) -> list[dict]:
        data = self._call("vkusvill_products_search", {"q": q, "limit": limit, "mode": "full"})
        return data["items"]

    def product_details(self, product_id: int) -> dict:
        return self._call("vkusvill_product_details", {"id": product_id})

    def cart_link(self, xml_ids: list[int]) -> str:
        if not xml_ids:
            raise ValueError("корзина пуста: передай хотя бы один xml_id товара")
        products = [{"xml_id": xml_id, "q": 1} for xml_id in xml_ids]
        return self._call("vkusvill_cart_link_create", {"products": products})["link"]

    def _call(self, tool: str, arguments: dict):
        response = self._transport(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": tool, "arguments": arguments},
            }
        )
        if "error" in response:
            raise ValueError(f"ВкусВилл отклонил запрос {tool}: {response['error']['message']}")
        result = response["result"]
        text = "".join(part["text"] for part in result["content"] if part["type"] == "text")
        if result.get("isError"):
            raise ValueError(f"ВкусВилл вернул ошибку {tool}: {text}")
        body = json.loads(text)
        if not body["ok"]:
            raise ValueError(f"ВкусВилл вернул ошибку {tool}: {body['error']['message']}")
        return body["data"]
