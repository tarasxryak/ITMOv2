import copy
import json
import unittest
from pathlib import Path

from core.catalog import BASKET_PORTION_GRAMS, build_catalog, catalog_product, parse_grams

FIXTURES = Path(__file__).parent / "fixtures"
KBJU_PROPERTY = "Пищевая и энергетическая ценность в 100 г"


def items(fixture: str) -> list[dict]:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))["data"]["items"]


def item(fixture: str, product_id: int) -> dict:
    return next(i for i in items(fixture) if i["id"] == product_id)


def details(fixture: str) -> dict:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))["data"]


class ParseGramsTest(unittest.TestCase):
    def test_grams(self):
        self.assertEqual(parse_grams("Творог 5%, 180 г"), 180)

    def test_html_nbsp_from_vkusvill(self):
        self.assertEqual(parse_grams("Творог 5%, 180&nbsp;г"), 180)

    def test_percent_is_not_weight(self):
        self.assertEqual(parse_grams('Шоколад горький 85%, 90 г'), 90)
        self.assertEqual(parse_grams("Творог для сырников 9% 350 г"), 350)

    def test_litres_and_millilitres_count_as_grams(self):
        self.assertEqual(parse_grams("Вода родниковая негазированная, 1,5 л"), 1500)
        self.assertEqual(parse_grams('Вода "Легенда Байкала", негаз., 750 мл'), 750)

    def test_kilograms(self):
        self.assertEqual(parse_grams("Сыр твёрдый, 0,3 кг"), 300)

    def test_multipack_multiplies(self):
        self.assertEqual(parse_grams("Вода артезианская (набор 12 шт х 500 мл)"), 6000)

    def test_none_when_name_has_no_weight(self):
        self.assertIsNone(parse_grams('Чипсы картофельные "Сметана-лук"'))
        self.assertIsNone(parse_grams("Филе грудки цыпленка-бройлера"))


class CatalogProductTest(unittest.TestCase):
    def test_piece_product_takes_grams_from_name(self):
        product = catalog_product(item("search_tvorog_limit10.json", 27695))
        self.assertEqual(product["id"], 27695)
        self.assertEqual(product["xml_id"], 27695)
        self.assertEqual(product["name"], "Творог 5%, 180 г")
        self.assertEqual(product["price"], 108)
        self.assertEqual(product["unit"], "шт")
        self.assertEqual(product["url"], "https://vkusvill.ru/goods/tvorog-5-27695/")
        self.assertTrue(product["image"].startswith("https://img.vkusvill.ru/"))
        self.assertEqual(product["kbju"], {"protein": 16.0, "fat": 5.0, "carbs": 3.0, "kcal": 121.0})
        self.assertEqual(product["score"], 0.529)
        self.assertEqual(product["category"], "Творог")
        self.assertEqual(product["portion"], {"grams": 180, "price": 108})

    def test_search_weight_placeholder_is_not_trusted(self):
        # В поиске у штучных товаров weight = 1 кг при любой реальной массе (творог 180 г).
        raw = item("search_tvorog_limit10.json", 27695)
        self.assertEqual(raw["weight"], {"value": 1, "unit": "кг"})
        raw = copy.deepcopy(raw)
        raw["name"] = "Творог 5%"
        self.assertIsNone(catalog_product(raw)["portion"])

    def test_weighed_product_is_sold_by_a_fixed_portion(self):
        # Филе грудки: unit «кг», цена 656 ₽ за килограмм → порция 500 г стоит 328 ₽.
        product = catalog_product(item("search_kuritsa_limit10.json", 488))
        self.assertEqual(product["unit"], "кг")
        self.assertEqual(product["price"], 656)
        self.assertEqual(product["portion"], {"grams": BASKET_PORTION_GRAMS, "price": 328})

    def test_product_details_weight_fills_missing_name_grams(self):
        raw = copy.deepcopy(item("search_tvorog_limit10.json", 27695))
        raw["name"] = "Творог 5%"
        product = catalog_product(raw, details=details("details_27695.json"))
        self.assertEqual(product["portion"], {"grams": 180, "price": 108})

    def test_name_wins_over_product_details(self):
        raw = item("search_tvorog_limit10.json", 27695)
        other = copy.deepcopy(details("details_27695.json"))
        other["weight"] = {"value": 0.5, "unit": "кг"}
        self.assertEqual(catalog_product(raw, details=other)["portion"]["grams"], 180)

    def test_product_without_kbju_is_rejected(self):
        raw = copy.deepcopy(item("search_tvorog_limit10.json", 27695))
        raw["properties"] = [p for p in raw["properties"] if p["name"] != KBJU_PROPERTY]
        with self.assertRaisesRegex(ValueError, "нет КБЖУ"):
            catalog_product(raw)

    def test_product_without_category_gets_none(self):
        raw = copy.deepcopy(item("search_tvorog_limit10.json", 27695))
        raw["category"] = None
        self.assertIsNone(catalog_product(raw)["category"])


class BuildCatalogTest(unittest.TestCase):
    def test_skips_products_without_usable_kbju(self):
        # Вода: КБЖУ есть, но 0 ккал — в игру не годится.
        catalog = build_catalog(items("search_voda_limit10.json"))
        self.assertEqual(catalog, [])

    def test_deduplicates_by_id_and_sorts(self):
        batch = items("search_tvorog_limit10.json") + items("search_tvorog_limit10.json")
        catalog = build_catalog(batch)
        ids = [p["id"] for p in catalog]
        self.assertEqual(ids, sorted(set(ids)))
        self.assertGreaterEqual(len(ids), 5)

    def test_mixes_categories(self):
        catalog = build_catalog(items("search_tvorog_limit10.json") + items("search_kuritsa_limit10.json"))
        self.assertEqual({p["category"] for p in catalog}, {"Творог", "Курица"})

    def test_details_fetched_only_for_products_without_portion(self):
        asked = []

        def fetch_details(product_id: int) -> dict:
            asked.append(product_id)
            return details("details_188.json")

        raw = copy.deepcopy(item("search_tvorog_limit10.json", 188))
        raw["name"] = "Творог 9%"
        named = item("search_tvorog_limit10.json", 27695)
        catalog = build_catalog([raw, named], fetch_details=fetch_details)
        self.assertEqual(asked, [188])
        by_id = {p["id"]: p for p in catalog}
        self.assertEqual(by_id[188]["portion"]["grams"], 400)
        self.assertEqual(by_id[27695]["portion"]["grams"], 180)

    def test_failed_details_leave_portion_empty(self):
        def fetch_details(product_id: int) -> dict:
            raise ValueError("товар не найден")

        raw = copy.deepcopy(item("search_tvorog_limit10.json", 188))
        raw["name"] = "Творог 9%"
        [product] = build_catalog([raw], fetch_details=fetch_details)
        self.assertIsNone(product["portion"])


if __name__ == "__main__":
    unittest.main()
