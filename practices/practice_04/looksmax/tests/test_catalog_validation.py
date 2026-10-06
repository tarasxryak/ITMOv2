import copy
import json
import tempfile
import unittest
from pathlib import Path

from core.catalog import MIN_BASKET_PRODUCTS, MIN_DUEL_PRODUCTS, validate_catalog
from scripts.build_catalog import OUTPUT, render_catalog_json, write_catalog

REAL = json.loads(OUTPUT.read_text(encoding="utf-8"))


class ValidateCatalogTest(unittest.TestCase):
    def test_committed_catalog_is_valid(self):
        self.assertEqual(validate_catalog(REAL), [])

    def test_committed_catalog_is_enough_for_both_games(self):
        self.assertGreaterEqual(len(REAL), MIN_DUEL_PRODUCTS)
        self.assertGreaterEqual(sum(1 for p in REAL if p["portion"]), MIN_BASKET_PRODUCTS)

    def test_duplicate_ids_are_reported(self):
        problems = validate_catalog(REAL + [copy.deepcopy(REAL[0])])
        self.assertTrue(any("повтор" in p for p in problems), problems)

    def test_wrong_score_is_reported_with_product_id(self):
        broken = copy.deepcopy(REAL)
        broken[0]["score"] = 0.999
        problems = validate_catalog(broken)
        self.assertTrue(any(str(broken[0]["id"]) in p and "скор" in p for p in problems), problems)

    def test_zero_kcal_is_reported(self):
        broken = copy.deepcopy(REAL)
        broken[0]["kbju"]["kcal"] = 0
        self.assertTrue(any("ккал" in p for p in validate_catalog(broken)))

    def test_unknown_unit_is_reported(self):
        broken = copy.deepcopy(REAL)
        broken[0]["unit"] = "л"
        self.assertTrue(any("unit" in p for p in validate_catalog(broken)))

    def test_bad_portion_is_reported(self):
        broken = copy.deepcopy(REAL)
        broken[0]["portion"] = {"grams": 0, "price": 100}
        self.assertTrue(any("порци" in p for p in validate_catalog(broken)))

    def test_too_few_products_for_duel(self):
        problems = validate_catalog(REAL[: MIN_DUEL_PRODUCTS - 1])
        self.assertTrue(any(str(MIN_DUEL_PRODUCTS) in p for p in problems), problems)

    def test_too_few_products_with_portion_for_basket(self):
        stripped = copy.deepcopy(REAL)
        for product in stripped:
            product["portion"] = None
        problems = validate_catalog(stripped)
        self.assertTrue(any(str(MIN_BASKET_PRODUCTS) in p for p in problems), problems)

    def test_needs_several_categories_for_mixed_rounds(self):
        one_category = copy.deepcopy(REAL)
        for product in one_category:
            product["category"] = "Творог"
        self.assertTrue(any("категор" in p for p in validate_catalog(one_category)))


class WriteCatalogTest(unittest.TestCase):
    def test_valid_catalog_is_written(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "nested" / "catalog.json"
            write_catalog(REAL, target)
            self.assertEqual(target.read_text(encoding="utf-8"), render_catalog_json(REAL))

    def test_broken_catalog_is_not_written_and_error_lists_problems(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "catalog.json"
            target.write_text("старый каталог", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, str(MIN_DUEL_PRODUCTS)):
                write_catalog(REAL[:3], target)
            self.assertEqual(target.read_text(encoding="utf-8"), "старый каталог")


if __name__ == "__main__":
    unittest.main()
