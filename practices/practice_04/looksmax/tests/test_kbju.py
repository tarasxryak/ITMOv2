import json
import unittest
from pathlib import Path

from core.kbju import Kbju, parse_kbju

FIXTURES = Path(__file__).parent / "fixtures"
KBJU_PROPERTY = "Пищевая и энергетическая ценность в 100 г"


def kbju_value(fixture: str, product_id: int) -> str:
    data = json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))
    item = next(i for i in data["data"]["items"] if i["id"] == product_id)
    return next(p["value"] for p in item["properties"] if p["name"] == KBJU_PROPERTY)


class ParseKbjuTest(unittest.TestCase):
    def test_takes_first_manufacturer_block_before_br(self):
        # Творог 5%, 180 г: второй производитель отличается (углеводы 1.8; 116.2 ккал)
        value = kbju_value("search_tvorog.json", 27695)
        self.assertEqual(parse_kbju(value), Kbju(protein=16, fat=5, carbs=3, kcal=121))

    def test_parses_real_fixture_formats(self):
        cases = [
            # хвост «Поставщики:» без <br>
            ("search_tvorog.json", 185, Kbju(protein=16, fat=5, carbs=3, kcal=121)),
            ("search_tvorog.json", 24165, Kbju(protein=16, fat=9, carbs=3, kcal=157)),
            # лишние «соль - 5.5 г» и двойная запятая перед ними
            ("search_chips.json", 81955, Kbju(protein=58.7, fat=4.9, carbs=5.6, kcal=301.3)),
            # «сахара (общие) - 1.5 г, соль - 2.6 г» во втором блоке не мешают первому
            ("search_chips.json", 65291, Kbju(protein=5.5, fat=30, carbs=53, kcal=504)),
        ]
        for fixture, product_id, want in cases:
            with self.subTest(product_id=product_id):
                self.assertEqual(parse_kbju(kbju_value(fixture, product_id)), want)

    def test_missing_carbs_count_as_zero(self):
        # мясо: «белки 16 г, жиры 14 г, ; 190 ккал» — углеводов в строке нет
        cases = [
            ("search_kuritsa_limit10.json", 484, Kbju(protein=16, fat=14, carbs=0, kcal=190)),
            ("search_kuritsa_limit10.json", 488, Kbju(protein=20, fat=4, carbs=0, kcal=116)),
        ]
        for fixture, product_id, want in cases:
            with self.subTest(product_id=product_id):
                self.assertEqual(parse_kbju(kbju_value(fixture, product_id)), want)

    def test_accepts_comma_as_decimal_separator(self):
        value = "белки 5,5 г, жиры 38 г, углеводы 53,2 г; 576,4 ккал"
        self.assertEqual(parse_kbju(value), Kbju(protein=5.5, fat=38, carbs=53.2, kcal=576.4))

    def test_missing_fat_or_carbs_count_as_zero(self):
        cases = {
            "жиры": ("белки 16 г, углеводы 3 г; 121 ккал", Kbju(protein=16, fat=0, carbs=3, kcal=121)),
            "жиры и углеводы": ("белки 16 г, ; 64 ккал", Kbju(protein=16, fat=0, carbs=0, kcal=64)),
        }
        for missing, (value, want) in cases.items():
            with self.subTest(missing=missing):
                self.assertEqual(parse_kbju(value), want)

    def test_missing_protein_or_kcal_raises_value_error(self):
        cases = {
            "белки": "жиры 5 г, углеводы 3 г; 121 ккал",
            "ккал": "белки 16 г, жиры 5 г, углеводы 3 г",
        }
        for missing, value in cases.items():
            with self.subTest(missing=missing):
                with self.assertRaises(ValueError):
                    parse_kbju(value)

    def test_does_not_borrow_numbers_from_next_block(self):
        value = 'ООО "А": белки 16 г, жиры 5 г, углеводы 3 г<br>ООО "Б": белки 16 г, жиры 5 г, углеводы 3 г; 121 ккал'
        with self.assertRaises(ValueError):
            parse_kbju(value)
        value = 'ООО "А": белки 16 г, жиры 5 г; 121 ккал<br>ООО "Б": белки 16 г, жиры 5 г, углеводы 3 г; 121 ккал'
        self.assertEqual(parse_kbju(value), Kbju(protein=16, fat=5, carbs=0, kcal=121))

    def test_zero_kcal_raises_value_error(self):
        with self.assertRaises(ValueError):
            parse_kbju("белки 0 г, жиры 0 г, углеводы 0 г; 0 ккал")


if __name__ == "__main__":
    unittest.main()
