import re
from dataclasses import dataclass

_NUMBER = r"(\d+(?:[.,]\d+)?)"
_PATTERNS = {
    "protein": re.compile(r"белки\s+" + _NUMBER),
    "fat": re.compile(r"жиры\s+" + _NUMBER),
    "carbs": re.compile(r"углеводы\s+" + _NUMBER),
    "kcal": re.compile(_NUMBER + r"\s*ккал"),
}
_LABELS = {"protein": "белки", "fat": "жиры", "carbs": "углеводы", "kcal": "ккал"}
# У мяса и рыбы ВкусВилл не пишет углеводы, а иногда и жиры: «белки 16 г, жиры 14 г, ; 190 ккал».
_OPTIONAL = {"fat", "carbs"}


@dataclass(frozen=True)
class Kbju:
    protein: float
    fat: float
    carbs: float
    kcal: float


def parse_kbju(value: str) -> Kbju:
    block = value.split("<br>", 1)[0]
    numbers = {}
    for field, pattern in _PATTERNS.items():
        match = pattern.search(block)
        if match is None and field in _OPTIONAL:
            numbers[field] = 0.0
            continue
        if match is None:
            raise ValueError(f"в строке КБЖУ нет значения «{_LABELS[field]}»: {block!r}")
        numbers[field] = float(match.group(1).replace(",", "."))
    if numbers["kcal"] <= 0:
        raise ValueError(f"ккал в строке КБЖУ должны быть больше нуля: {block!r}")
    return Kbju(**numbers)
