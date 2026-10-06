import json
import os
import sys
import unittest
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.shared.memory import create_connected_server_and_client_session

from core.vkusvill import VkusVillClient
from server import create_server

ROOT = Path(__file__).parent.parent
FIXTURES = Path(__file__).parent / "fixtures"

# Запрос к ВкусВиллу (tool, arguments) → сохранённый реальный ответ на него.
ROUTES = [
    ("vkusvill_product_details", {"id": 27695}, "details_27695.json"),
    ("vkusvill_product_details", {"id": 24165}, "details_24165.json"),
    ("vkusvill_product_details", {"id": 188}, "details_188.json"),
    ("vkusvill_product_details", {"id": 79663}, "details_79663.json"),
    ("vkusvill_product_details", {"id": 999999999}, "details_999999999.json"),
    ("vkusvill_products_search", {"q": "творог", "limit": 10, "mode": "full"}, "search_tvorog_limit10.json"),
    ("vkusvill_products_search", {"q": "вода питьевая", "limit": 10, "mode": "full"}, "search_voda_limit10.json"),
    ("vkusvill_products_search", {"q": "курица", "limit": 10, "mode": "full"}, "search_kuritsa_limit10.json"),
]


class FixtureTransport:
    """Отвечает на tools/call ВкусВилла сохранёнными фикстурами; лишний запрос — ошибка теста."""

    def __init__(self):
        self.calls = []

    def __call__(self, payload: dict) -> dict:
        name, arguments = payload["params"]["name"], payload["params"]["arguments"]
        self.calls.append((name, arguments))
        for tool, args, fixture in ROUTES:
            if (tool, args) == (name, arguments):
                text = (FIXTURES / fixture).read_text(encoding="utf-8")
                return {
                    "jsonrpc": "2.0",
                    "id": payload["id"],
                    "result": {"content": [{"type": "text", "text": text}], "isError": False},
                }
        raise AssertionError(f"нет фикстуры для запроса {name} {arguments}")


class ServerTestCase(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.transport = FixtureTransport()
        self.server = create_server(VkusVillClient(self.transport))

    async def call_tool(self, tool: str, arguments: dict):
        # Сессия anyio должна открываться и закрываться в одной задаче, поэтому — на каждый вызов.
        async with create_connected_server_and_client_session(self.server) as session:
            return await session.call_tool(tool, arguments)

    async def call(self, tool: str, arguments: dict) -> dict:
        result = await self.call_tool(tool, arguments)
        self.assertFalse(result.isError, result.content)
        return json.loads(result.content[0].text)

    async def call_error(self, tool: str, arguments: dict) -> str:
        result = await self.call_tool(tool, arguments)
        self.assertTrue(result.isError, result.content)
        return result.content[0].text


class ScoreProductTest(ServerTestCase):
    async def test_returns_name_kbju_and_score(self):
        # 27695: белки 16, ккал 121 → 16 × 4 / 121 = 0.529
        product = await self.call("score_product", {"product_id": 27695})
        self.assertEqual(product["id"], 27695)
        self.assertEqual(product["name"], "Творог 5%, 180\xa0г")
        self.assertEqual(product["kbju"], {"protein": 16, "fat": 5, "carbs": 3, "kcal": 121})
        self.assertEqual(product["score"], 0.529)

    async def test_non_positive_id_is_tool_error_without_request(self):
        for product_id in (0, -5):
            with self.subTest(product_id=product_id):
                text = await self.call_error("score_product", {"product_id": product_id})
                self.assertIn("больше нуля", text)
        self.assertEqual(self.transport.calls, [])

    async def test_unknown_product_is_tool_error(self):
        # реальный ответ ВкусВилла на id 999999999: ok=false, «Некорректный id товара»
        text = await self.call_error("score_product", {"product_id": 999999999})
        self.assertIn("999999999", text)
        self.assertIn("не найден", text)

    async def test_product_without_kbju_is_tool_error(self):
        # 79663 — вода: свойство КБЖУ есть, но value = null
        text = await self.call_error("score_product", {"product_id": 79663})
        self.assertIn("нет КБЖУ", text)


class BuildRoundTest(ServerTestCase):
    async def test_builds_round_from_vkusvill_search(self):
        # творог, limit 10: 27695 и 185 → 0.529, 69259 → 12 × 4 / 74.5 = 0.644;
        # первая тройка по порядку поиска с отрывом ≥ 0.03
        round_ = await self.call("build_round", {"query": "творог"})
        self.assertEqual(round_["query"], "творог")
        self.assertEqual(round_["winner_id"], 69259)
        scores = {p["id"]: p["score"] for p in round_["products"]}
        self.assertEqual(scores, {27695: 0.529, 185: 0.529, 69259: 0.644})
        winner = next(p for p in round_["products"] if p["id"] == 69259)
        self.assertEqual(winner["kbju"], {"protein": 12, "fat": 2.5, "carbs": 1, "kcal": 74.5})

    async def test_builds_round_from_meat_without_carbs(self):
        # курица: «белки 16 г, жиры 14 г, ; 190 ккал» — углеводов нет, считаются 0.
        # 484 → 16 × 4 / 190 = 0.337, 19419 → 16 × 4 / 145 = 0.441, 488 → 20 × 4 / 116 = 0.690
        round_ = await self.call("build_round", {"query": "курица"})
        self.assertEqual(round_["winner_id"], 488)
        scores = {p["id"]: p["score"] for p in round_["products"]}
        self.assertEqual(scores, {484: 0.337, 19419: 0.441, 488: 0.69})
        winner = next(p for p in round_["products"] if p["id"] == 488)
        self.assertEqual(winner["kbju"], {"protein": 20, "fat": 4, "carbs": 0, "kcal": 116})

    async def test_empty_query_is_tool_error_without_request(self):
        for query in ("", "   "):
            with self.subTest(query=query):
                text = await self.call_error("build_round", {"query": query})
                self.assertIn("запрос пуст", text)
        self.assertEqual(self.transport.calls, [])

    async def test_query_without_three_products_with_kbju_is_tool_error(self):
        # вода питьевая: у всех 10 товаров КБЖУ = null
        text = await self.call_error("build_round", {"query": "вода питьевая"})
        self.assertIn("не нашлось трёх товаров", text)

    async def test_round_error_advises_only_what_the_tool_accepts(self):
        # Совет должен быть выполним через вход build_round: менять можно только query,
        # параметры поиска ВкусВилла (limit, page, …) сервер выставляет сам.
        async with create_connected_server_and_client_session(self.server) as session:
            tools = {t.name: t for t in (await session.list_tools()).tools}
        accepted = set(tools["build_round"].inputSchema["properties"])
        search_params = {"q", "limit", "page", "mode", "sort", "fields", "category_id", "vvonly"}
        text = await self.call_error("build_round", {"query": "вода питьевая"})
        self.assertIn("«вода питьевая»", text)
        self.assertIn("другой запрос", text)
        for param in search_params - accepted:
            with self.subTest(param=param):
                self.assertNotRegex(text, rf"\b{param}\b")


class JudgeRoundTest(ServerTestCase):
    # product_details: 27695 → 16 × 4 / 121 = 0.529; 24165 и 188 → 16 × 4 / 157 = 0.408
    ROUND = [24165, 27695, 188]

    async def test_choosing_winner_is_correct(self):
        verdict = await self.call("judge_round", {"product_ids": self.ROUND, "choice_id": 27695})
        self.assertEqual(
            verdict,
            {"correct": True, "winner_id": 27695, "scores": {"24165": 0.408, "27695": 0.529, "188": 0.408}},
        )

    async def test_choosing_other_product_is_wrong(self):
        verdict = await self.call("judge_round", {"product_ids": self.ROUND, "choice_id": 188})
        self.assertFalse(verdict["correct"])
        self.assertEqual(verdict["winner_id"], 27695)

    async def test_scores_come_from_product_details_of_each_id(self):
        await self.call("judge_round", {"product_ids": self.ROUND, "choice_id": 188})
        self.assertEqual(
            self.transport.calls,
            [("vkusvill_product_details", {"id": product_id}) for product_id in self.ROUND],
        )

    async def test_bad_round_is_tool_error_without_request(self):
        # 185 нет в фикстурах: запрос за ним провалил бы тест другой ошибкой
        cases = {
            "два id": ([27695, 24165], 27695, "ровно 3"),
            "четыре id": ([27695, 24165, 188, 185], 27695, "ровно 3"),
            "повтор": ([27695, 24165, 27695], 27695, "повторяются"),
            "выбор не из списка": (self.ROUND, 185, "не из раунда"),
        }
        for reason, (product_ids, choice_id, expected) in cases.items():
            with self.subTest(reason=reason):
                text = await self.call_error("judge_round", {"product_ids": product_ids, "choice_id": choice_id})
                self.assertIn(expected, text)
        self.assertEqual(self.transport.calls, [])


class StdioTest(unittest.IsolatedAsyncioTestCase):
    async def test_server_py_serves_three_tools_over_stdio(self):
        # как в .mcp.json: .venv/bin/python server.py; list_tools не ходит во ВкусВилл
        params = StdioServerParameters(command=sys.executable, args=["server.py"], cwd=ROOT)
        errlog = self.enterContext(open(os.devnull, "w"))
        async with stdio_client(params, errlog=errlog) as (read, write):
            async with ClientSession(read, write) as session:
                init = await session.initialize()
                tools = (await session.list_tools()).tools
        self.assertEqual(init.serverInfo.name, "looksmax")
        self.assertEqual(
            {t.name: sorted(t.inputSchema["required"]) for t in tools},
            {
                "score_product": ["product_id"],
                "build_round": ["query"],
                "judge_round": ["choice_id", "product_ids"],
            },
        )


if __name__ == "__main__":
    unittest.main()
