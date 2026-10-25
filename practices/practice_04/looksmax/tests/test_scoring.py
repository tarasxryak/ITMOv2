import unittest

from core.kbju import Kbju
from core.scoring import coins_for_answer, rank, score


class ScoreTest(unittest.TestCase):
    def test_protein_share_of_kcal_rounded_to_three_places(self):
        cases = [
            (Kbju(protein=16, fat=5, carbs=3, kcal=121), 0.529),  # 64 / 121 = 0.52892
            (Kbju(protein=58.7, fat=4.9, carbs=5.6, kcal=301.3), 0.779),  # 234.8 / 301.3 = 0.77929
            (Kbju(protein=5.5, fat=30, carbs=53, kcal=504), 0.044),  # 22 / 504 = 0.04365
        ]
        for kbju, want in cases:
            with self.subTest(kbju=kbju):
                self.assertEqual(score(kbju), want)

    def test_non_positive_kcal_raises_value_error(self):
        for kcal in (0, -5):
            with self.subTest(kcal=kcal):
                with self.assertRaises(ValueError):
                    score(Kbju(protein=10, fat=1, carbs=1, kcal=kcal))


class CoinsForAnswerTest(unittest.TestCase):
    def test_reward_depends_on_correctness_and_streak(self):
        # streak — длина серии верных ответов подряд, включая текущий
        cases = [
            (False, 0, 0),
            (True, 1, 10),
            (True, 2, 10),
            (True, 3, 15),
            (True, 4, 15),
            (True, 10, 15),
        ]
        for correct, streak, want in cases:
            with self.subTest(correct=correct, streak=streak):
                self.assertEqual(coins_for_answer(correct, streak), want)

    def test_inconsistent_streak_raises_value_error(self):
        for correct, streak in [(True, 0), (False, -1), (True, -1)]:
            with self.subTest(correct=correct, streak=streak):
                with self.assertRaises(ValueError):
                    coins_for_answer(correct, streak)


class RankTest(unittest.TestCase):
    def test_rank_for_every_possible_result(self):
        # процент = верные / 10 × 100
        cases = [
            (0, "sub3"),
            (1, "sub3"),
            (2, "sub5"),
            (3, "sub5"),
            (4, "LTN"),
            (5, "MTN"),
            (6, "HTN"),
            (7, "chadlite"),
            (8, "chad"),
            (9, "chad"),
            (10, "true adam"),
        ]
        for correct_count, want in cases:
            with self.subTest(correct_count=correct_count):
                self.assertEqual(rank(correct_count), want)

    def test_count_outside_zero_to_ten_raises_value_error(self):
        for correct_count in (-1, 11):
            with self.subTest(correct_count=correct_count):
                with self.assertRaises(ValueError):
                    rank(correct_count)


if __name__ == "__main__":
    unittest.main()
