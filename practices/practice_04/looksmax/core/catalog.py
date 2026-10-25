import html
import re
from collections import Counter
from typing import Callable

from core.rounds import describe_product

# Весовой товар (мясо, рыба) ВкусВилл продаёт за кг; в игре с бюджетом берётся порцией.
BASKET_PORTION_GRAMS = 500
# Сколько товаров нужно играм: дуэль — 10 раундов по 3 товара без повторов, корзина — набор из 12.
MIN_DUEL_PRODUCTS = 30
MIN_BASKET_PRODUCTS = 12
# В раунде дуэли три товара из разных категорий.
MIN_CATEGORIES = 3

_VALUE = r"(\d+(?:[.,]\d+)?)"
_UNIT = r"(кг|г|л|мл)\b"
_GRAMS_PER_UNIT = {"г": 1, "мл": 1, "кг": 1000, "л": 1000}
_SINGLE = re.compile(_VALUE + r"\s*" + _UNIT)
# «набор 12 шт х 500 мл»: буква х бывает и латинской, и кириллической.
_MULTIPACK = re.compile(r"(\d+)\s*шт\.?\s*[xхXХ×]\s*" + _VALUE + r"\s*" + _UNIT)

FetchDetails = Callable[[int], dict]


def _to_grams(value: str, unit: str) -> int:
    return round(float(value.replace(",", ".")) * _GRAMS_PER_UNIT[unit])


def parse_grams(name: str) -> int | None:
    """Масса упаковки из названия: «180 г», «1,5 л», «набор 12 шт х 500 мл». Нет в названии — None."""
    text = html.unescape(name)
    pack = _MULTIPACK.search(text)
    if pack:
        return int(pack.group(1)) * _to_grams(pack.group(2), pack.group(3))
    single = _SINGLE.search(text)
    if single:
        return _to_grams(single.group(1), single.group(2))
    return None


def _details_grams(details: dict | None) -> int | None:
    weight = (details or {}).get("weight")
    if not weight or weight.get("value", 0) <= 0 or weight.get("unit") not in _GRAMS_PER_UNIT:
        return None
    return _to_grams(str(weight["value"]), weight["unit"])


def _portion(item: dict, details: dict | None) -> dict | None:
    price = item["price"]["current"]
    if item["unit"] == "кг":
        return {"grams": BASKET_PORTION_GRAMS, "price": int(price * BASKET_PORTION_GRAMS / 1000 + 0.5)}
    # weight из поиска у штучных товаров всегда 1 кг, ему не верим: масса — из названия или из product_details.
    grams = parse_grams(item["name"]) or _details_grams(details)
    return {"grams": grams, "price": price} if grams else None


def catalog_product(item: dict, details: dict | None = None) -> dict:
    """Товар ВкусВилла (из поиска) → запись каталога игры. Без КБЖУ — ValueError."""
    described = describe_product(item)
    images = item.get("images") or []
    categories = item.get("category") or []
    return {
        "id": described["id"],
        "xml_id": described["xml_id"],
        "name": described["name"].replace("\xa0", " "),
        "price": item["price"]["current"],
        "unit": item["unit"],
        "url": item["url"],
        "image": images[0]["medium"] if images else None,
        "kbju": described["kbju"],
        "score": described["score"],
        "category": categories[0]["name"] if categories else None,
        "portion": _portion(item, details),
    }


def build_catalog(items: list[dict], fetch_details: FetchDetails | None = None) -> list[dict]:
    """Каталог игры из товаров поиска: без дублей по id, без товаров без КБЖУ, по возрастанию id.

    fetch_details вызывается только для товаров, у которых порцию не удалось определить по названию.
    """
    catalog = {}
    for item in items:
        if item["id"] in catalog:
            continue
        try:
            product = catalog_product(item)
        except ValueError:
            continue
        if product["portion"] is None and fetch_details is not None:
            try:
                product = catalog_product(item, fetch_details(item["id"]))
            except ValueError:
                pass
        catalog[item["id"]] = product
    return [catalog[i] for i in sorted(catalog)]


def validate_catalog(catalog: list[dict]) -> list[str]:
    """Что мешает играм работать с этим каталогом. Пустой список — каталог годится."""
    problems = []
    repeated = sorted(i for i, n in Counter(p["id"] for p in catalog).items() if n > 1)
    if repeated:
        problems.append(f"id повторяются: {repeated}")
    for product in catalog:
        pid, kbju, portion = product["id"], product["kbju"], product["portion"]
        if product["unit"] not in ("шт", "кг"):
            problems.append(f"товар {pid}: unit должен быть «шт» или «кг», сейчас {product['unit']!r}")
        if kbju["kcal"] <= 0:
            problems.append(f"товар {pid}: ккал должны быть больше нуля")
        elif product["score"] != (expected := round(kbju["protein"] * 4 / kbju["kcal"], 3)):
            problems.append(f"товар {pid}: скор {product['score']} не равен белки × 4 / ккал = {expected}")
        if portion is not None and (portion["grams"] <= 0 or portion["price"] <= 0):
            problems.append(f"товар {pid}: порция должна иметь массу и цену больше нуля")
    if len(catalog) < MIN_DUEL_PRODUCTS:
        problems.append(f"для дуэли нужно минимум {MIN_DUEL_PRODUCTS} товаров, в каталоге {len(catalog)}")
    with_portion = sum(1 for p in catalog if p["portion"])
    if with_portion < MIN_BASKET_PRODUCTS:
        problems.append(f"для корзины нужно минимум {MIN_BASKET_PRODUCTS} товаров с известной массой, их {with_portion}")
    categories = {p["category"] for p in catalog if p["category"]}
    if len(categories) < MIN_CATEGORIES:
        problems.append(f"нужно минимум {MIN_CATEGORIES} категории товаров, в каталоге {len(categories)}")
    return problems
