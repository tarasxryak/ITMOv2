import copy
import json
import unittest
from itertools import combinations
from pathlib import Path

from core.rounds import build_round, judge_round

FIXTURES = Path(__file__).parent / "fixtures"
KBJU_PROPERTY = "Пищевая и энергетическая ценность в 100 г"


def items(fixture: str) -> list[dict]:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))["data"]["items"]


def pick(fixture: str, *ids: int) -> list[dict]:
    by_id = {i["id"]: i for i in items(fixture)}
    return [by_id[i] for i in ids]


def details(fixture: str) -> dict:
    return json.loads((FIXTURES / fixture).read_text(encoding="utf-8"))["data"]


def without_kbju(item: dict) -> dict:
    item = copy.deepcopy(item)
    item["properties"] = [p for p in item["properties"] if p["name"] != KBJU_PROPERTY]
    return item


def with_kbju(item: dict, value: str) -> dict:
    item = copy.deepcopy(item)
    for p in item["properties"]:
        if p["name"] == KBJU_PROPERTY:
            p["value"] = value
    return item


def ids(round_: dict) -> set[int]:
    return {p["id"] for p in round_["products"]}


class BuildRoundTest(unittest.TestCase):
    def test_picks_three_products_with_single_winner(self):
        # чипсы: 65291 → 0.044, 81955 → 0.779, 26751 → 0.048 — первая тройка по порядку поиска
        round_ = build_round("чипсы", items("search_chips.json"))
        self.assertEqual(round_["query"], "чипсы")
        self.assertEqual(ids(round_), {65291, 81955, 26751})
        self.assertEqual(round_["winner_id"], 81955)

    def test_skips_triples_where_top_score_is_tied(self):
        # творог: 27695, 185, 21347 → 0.529; 24165, 188 → 0.408.
        # Две «пятипроцентные» пачки в одной тройке — ничья за первое место.
        round_ = build_round("творог", items("search_tvorog.json"))
        self.assertEqual(ids(round_), {27695, 24165, 188})
        self.assertEqual(round_["winner_id"], 27695)

    def test_products_carry_name_kbju_and_score(self):
        round_ = build_round("творог", items("search_tvorog.json"))
        product = next(p for p in round_["products"] if p["id"] == 27695)
        self.assertEqual(
            product,
            {
                "id": 27695,
                "xml_id": 27695,
                "name": "Творог 5%, 180 г",
                "kbju": {"protein": 16, "fat": 5, "carbs": 3, "kcal": 121},
                "score": 0.529,
            },
        )

    def test_ignores_items_without_valid_kbju(self):
        chips = items("search_chips.json")
        cases = {
            "нет свойства": without_kbju(chips[0]),
            "нет белков": with_kbju(chips[0], "жиры 30 г, углеводы 53 г; 504 ккал"),
        }
        for reason, broken in cases.items():
            with self.subTest(reason=reason):
                # без 65291 первая тройка — 81955, 26751, 110380
                round_ = build_round("чипсы", [broken] + chips[1:])
                self.assertEqual(ids(round_), {81955, 26751, 110380})

    def test_winner_beats_second_place_by_at_least_0_03(self):
        # 81955 0.779 с тремя чипсами около 0.04 — проходит; в остальных отрыв < 0.03
        tvorog = items("search_tvorog.json")
        with self.assertRaises(ValueError):
            # 0.529, 0.529, 0.529: победителя нет
            build_round("творог", tvorog[:3])
        with self.assertRaises(ValueError):
            # 0.044, 0.048, 0.047, 0.038: лучший опережает второго на 0.001
            build_round("чипсы", pick("search_chips.json", 65291, 26751, 110380, 74423))

    def test_gap_of_exactly_0_03_is_enough(self):
        a, b, c = pick("search_chips.json", 65291, 26751, 110380)
        given = [
            # во float 0.141 - 0.111 = 0.029999999999999985
            with_kbju(a, "белки 3.525 г, жиры 1 г, углеводы 1 г; 100 ккал"),  # 0.141
            with_kbju(b, "белки 2.775 г, жиры 1 г, углеводы 1 г; 100 ккал"),  # 0.111
            c,  # 0.047
        ]
        self.assertEqual(build_round("чипсы", given)["winner_id"], 65291)
        given[1] = with_kbju(b, "белки 2.8 г, жиры 1 г, углеводы 1 г; 100 ккал")  # 0.112
        with self.assertRaises(ValueError):
            build_round("чипсы", given)

    def test_fewer_than_three_products_with_kbju_raises_value_error(self):
        chips = items("search_chips.json")
        cases = {
            "два товара": chips[:2],
            "третий без КБЖУ": chips[:2] + [without_kbju(chips[2])],
            "третий — повтор первого": chips[:2] + [chips[0]],
            "пусто": [],
        }
        for reason, given in cases.items():
            with self.subTest(reason=reason):
                with self.assertRaises(ValueError):
                    build_round("чипсы", given)

    def test_empty_query_raises_value_error(self):
        for query in ("", "   "):
            with self.subTest(query=query):
                with self.assertRaises(ValueError):
                    build_round(query, items("search_chips.json"))

    def test_winner_position_varies_between_rounds(self):
        # 81955 с каждой парой из четырёх картофельных чипсов: шесть разных раундов
        others = [65291, 26751, 110380, 74423]
        positions = set()
        for a, b in combinations(others, 2):
            round_ = build_round("чипсы", pick("search_chips.json", 81955, a, b))
            positions.add([p["id"] for p in round_["products"]].index(81955))
        self.assertEqual(positions, {0, 1, 2})

    def test_same_input_gives_same_round(self):
        chips = items("search_chips.json")
        self.assertEqual(build_round("чипсы", chips), build_round("чипсы", chips))


class JudgeRoundTest(unittest.TestCase):
    def products(self) -> list[dict]:
        # 27695 из product_details (0.529), 24165 и 188 из поиска (0.408)
        return [details("details_27695.json")] + pick("search_tvorog.json", 24165, 188)

    def test_choosing_winner_is_correct(self):
        self.assertEqual(
            judge_round(self.products(), 27695),
            {"correct": True, "winner_id": 27695, "scores": {27695: 0.529, 24165: 0.408, 188: 0.408}},
        )

    def test_choosing_other_product_is_wrong(self):
        verdict = judge_round(self.products(), 188)
        self.assertFalse(verdict["correct"])
        self.assertEqual(verdict["winner_id"], 27695)

    def test_not_exactly_three_products_raises_value_error(self):
        tvorog = items("search_tvorog.json")
        for count in (2, 4):
            with self.subTest(count=count):
                with self.assertRaises(ValueError):
                    judge_round(tvorog[3:5] + tvorog[:count - 2], 24165)

    def test_repeated_product_raises_value_error(self):
        with self.assertRaises(ValueError):
            judge_round(pick("search_tvorog.json", 27695, 24165, 27695), 27695)

    def test_choice_outside_round_raises_value_error(self):
        with self.assertRaises(ValueError):
            judge_round(self.products(), 185)

    def test_product_without_kbju_raises_value_error(self):
        products = self.products()
        products[1] = without_kbju(products[1])
        with self.assertRaises(ValueError):
            judge_round(products, 27695)

    def test_tied_top_scores_raise_value_error(self):
        # 27695 и 185 — оба 0.529
        with self.assertRaises(ValueError):
            judge_round(pick("search_tvorog.json", 27695, 185, 24165), 27695)


if __name__ == "__main__":
    unittest.main()
