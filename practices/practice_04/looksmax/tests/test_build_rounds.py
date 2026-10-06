import copy
import json
import unittest
from pathlib import Path

from scripts.build_rounds import build_rounds, product_record, render_rounds_js

FIXTURES = Path(__file__).parent / "fixtures"
PREFIX = "window.LOOKSMAX_ROUNDS = "


def items(fixture: str) -> list[dict]:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))["data"]["items"]


def item(fixture: str, product_id: int) -> dict:
    return next(i for i in items(fixture) if i["id"] == product_id)


class FixtureSearch:
    """Поиск ВкусВилла по сохранённым ответам: запрос → items фикстуры."""

    def __init__(self, fixtures: dict[str, str]):
        self.fixtures = fixtures
        self.queries = []

    def __call__(self, query: str) -> list[dict]:
        self.queries.append(query)
        return items(self.fixtures[query])


class ProductRecordTest(unittest.TestCase):
    def test_record_has_everything_the_game_shows(self):
        self.assertEqual(
            product_record(item("search_tvorog_limit10.json", 27695)),
            {
                "id": 27695,
                "xml_id": 27695,
                "name": "Творог 5%, 180\xa0г",
                "price": 108,
                "url": "https://vkusvill.ru/goods/tvorog-5-27695/",
                "image": "https://img.vkusvill.ru/pim/images/site/site_BigWebP/"
                "daa8cbe3-0f81-4ccc-9a28-ee002327aa89.webp?1790122094",
                "kbju": {"protein": 16, "fat": 5, "carbs": 3, "kcal": 121},
                "score": 0.529,
            },
        )

    def test_name_has_no_html_entities(self):
        # в поиске «Творог обезжиренный высокобелковый, 200&nbsp;г»
        name = product_record(item("search_tvorog_limit10.json", 112616))["name"]
        self.assertNotIn("&", name)
        self.assertEqual(name, "Творог обезжиренный высокобелковый, 200\xa0г")

    def test_image_is_none_without_images(self):
        given = copy.deepcopy(item("search_chips.json", 81955))
        for images in ([], None):
            with self.subTest(images=images):
                given["images"] = images
                self.assertIsNone(product_record(given)["image"])


class BuildRoundsTest(unittest.TestCase):
    def test_one_round_per_query_in_given_order(self):
        search = FixtureSearch({"творог": "search_tvorog_limit10.json", "чипсы": "search_chips.json"})
        rounds = build_rounds(["чипсы", "творог"], search)
        self.assertEqual(search.queries, ["чипсы", "творог"])
        self.assertEqual([r["query"] for r in rounds], ["чипсы", "творог"])
        # чипсы: куриные 0.779 против картофельных ~0.04; творог: «Зернышко» 2,5% 0.644 против 5% 0.529
        self.assertEqual([r["winner_id"] for r in rounds], [81955, 69259])

    def test_round_products_are_full_records(self):
        rounds = build_rounds(["чипсы"], FixtureSearch({"чипсы": "search_chips.json"}))
        products = {p["id"]: p for p in rounds[0]["products"]}
        self.assertEqual(set(products), {65291, 81955, 26751})
        self.assertEqual(products[26751]["price"], 125)
        self.assertEqual(products[26751]["url"], "https://vkusvill.ru/goods/chipsy-kartofelnye-s-solyu-26751/")
        self.assertEqual(products[81955]["score"], 0.779)

    def test_query_without_round_raises_value_error(self):
        # у воды в поиске нет КБЖУ: трёх товаров для раунда не набрать
        with self.assertRaises(ValueError):
            build_rounds(["чипсы", "вода питьевая"], FixtureSearch({
                "чипсы": "search_chips.json",
                "вода питьевая": "search_voda_limit10.json",
            }))


class RenderRoundsJsTest(unittest.TestCase):
    def rounds(self) -> list[dict]:
        return build_rounds(["творог"], FixtureSearch({"творог": "search_tvorog_limit10.json"}))

    def test_assigns_rounds_to_window_global(self):
        text = render_rounds_js(self.rounds())
        self.assertTrue(text.startswith(PREFIX))
        self.assertTrue(text.endswith(";\n"))
        self.assertEqual(json.loads(text[len(PREFIX):-2]), self.rounds())

    def test_keeps_cyrillic_readable(self):
        text = render_rounds_js(self.rounds())
        self.assertIn("Творог", text)
        self.assertNotIn("\\u04", text)


if __name__ == "__main__":
    unittest.main()
