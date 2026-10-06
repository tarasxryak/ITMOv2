import json
import unittest
from pathlib import Path

from scripts.build_catalog import QUERIES, collect_catalog, render_catalog_json

FIXTURES = Path(__file__).parent / "fixtures"


def items(fixture: str) -> list[dict]:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))["data"]["items"]


class FixtureSearch:
    """Поиск ВкусВилла по сохранённым ответам: запрос → items фикстуры."""

    def __init__(self, fixtures: dict[str, str]):
        self.fixtures = fixtures
        self.queries = []

    def __call__(self, query: str) -> list[dict]:
        self.queries.append(query)
        if query not in self.fixtures:
            raise ValueError(f"ВкусВилл вернул ошибку vkusvill_products_search: {query}")
        return items(self.fixtures[query])


class CollectCatalogTest(unittest.TestCase):
    def test_merges_all_queries_into_one_catalog(self):
        search = FixtureSearch({"творог": "search_tvorog_limit10.json", "курица": "search_kuritsa_limit10.json"})
        catalog = collect_catalog(["творог", "курица"], search)
        self.assertEqual(search.queries, ["творог", "курица"])
        self.assertEqual({p["category"] for p in catalog}, {"Творог", "Курица"})

    def test_failed_query_is_reported_and_does_not_stop_the_run(self):
        search = FixtureSearch({"творог": "search_tvorog_limit10.json"})
        failures = []
        catalog = collect_catalog(["нет такого", "творог"], search, on_error=lambda q, e: failures.append(q))
        self.assertEqual(failures, ["нет такого"])
        self.assertTrue(catalog)

    def test_details_are_requested_for_products_without_grams_in_name(self):
        search = FixtureSearch({"чипсы": "search_chips.json"})
        asked = []

        def fetch_details(product_id: int) -> dict:
            asked.append(product_id)
            raise ValueError("нет данных")

        catalog = collect_catalog(["чипсы"], search, fetch_details=fetch_details)
        self.assertEqual(sorted(asked), sorted(p["id"] for p in catalog))
        self.assertTrue(all(p["portion"] is None for p in catalog))


class RenderCatalogTest(unittest.TestCase):
    def test_json_roundtrips_with_cyrillic_and_one_product_per_line(self):
        catalog = collect_catalog(["творог"], FixtureSearch({"творог": "search_tvorog_limit10.json"}))
        text = render_catalog_json(catalog)
        self.assertEqual(json.loads(text), catalog)
        self.assertIn("Творог", text)
        self.assertEqual(len(text.strip().splitlines()), len(catalog) + 2)


class QueriesTest(unittest.TestCase):
    def test_queries_are_many_and_distinct(self):
        self.assertGreaterEqual(len(QUERIES), 80)
        self.assertEqual(len(QUERIES), len(set(QUERIES)))
        self.assertTrue(all(q.strip() == q and q for q in QUERIES))


if __name__ == "__main__":
    unittest.main()
