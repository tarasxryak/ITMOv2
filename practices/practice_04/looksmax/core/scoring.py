from core.kbju import Kbju


def score(kbju: Kbju) -> float:
    if kbju.kcal <= 0:
        raise ValueError("ккал должны быть больше нуля")
    return round(kbju.protein * 4 / kbju.kcal, 3)


def coins_for_answer(correct: bool, streak: int) -> int:
    """streak — длина серии верных ответов подряд, включая текущий."""
    if streak < 0:
        raise ValueError("длина серии не может быть отрицательной")
    if correct and streak < 1:
        raise ValueError("при верном ответе серия должна быть не меньше 1")
    if not correct:
        return 0
    if streak >= 3:
        return 15
    return 10


# Нижняя граница процента -> ранг, от старшего к младшему.
_RANKS = [
    (100, "true adam"),
    (80, "chad"),
    (70, "chadlite"),
    (60, "HTN"),
    (50, "MTN"),
    (40, "LTN"),
    (20, "sub5"),
    (0, "sub3"),
]


def rank(correct_count: int) -> str:
    if not 0 <= correct_count <= 10:
        raise ValueError("число верных ответов должно быть от 0 до 10")
    percent = correct_count / 10 * 100
    for threshold, name in _RANKS:
        if percent >= threshold:
            return name
