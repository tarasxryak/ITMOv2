import html
from itertools import combinations

from core.kbju import parse_kbju
from core.scoring import score

KBJU_PROPERTY = "Пищевая и энергетическая ценность в 100 г"
MIN_WINNER_GAP = 0.03


def describe_product(item: dict) -> dict:
    """Товар ВкусВилла (из поиска или product_details) → id, название, КБЖУ, скор."""
    value = next((p["value"] for p in item.get("properties", []) if p["name"] == KBJU_PROPERTY), None)
    if value is None:
        raise ValueError(f"у товара {item['id']} нет КБЖУ: выбери другой товар")
    kbju = parse_kbju(value)
    return {
        "id": item["id"],
        "xml_id": item["xml_id"],
        "name": html.unescape(item["name"]),
        "kbju": {"protein": kbju.protein, "fat": kbju.fat, "carbs": kbju.carbs, "kcal": kbju.kcal},
        "score": score(kbju),
    }


def _single_winner(products: list[dict]) -> dict | None:
    first, second = sorted(products, key=lambda p: p["score"], reverse=True)[:2]
    # Скоры округлены до 3 знаков; без round 0.141 - 0.111 во float меньше 0.03.
    if round(first["score"] - second["score"], 3) < MIN_WINNER_GAP:
        return None
    return first


def check_query(query: str) -> None:
    """Проверка запроса до похода в поиск ВкусВилла."""
    if not query.strip():
        raise ValueError("поисковый запрос пуст: укажи категорию, например «творог»")


def build_round(query: str, items: list[dict]) -> dict:
    check_query(query)
    candidates = {}
    for item in items:
        if item["id"] in candidates:
            continue
        try:
            candidates[item["id"]] = describe_product(item)
        except ValueError:
            continue
    for triple in combinations(candidates.values(), 3):
        winner = _single_winner(list(triple))
        if winner is None:
            continue
        losers = [p for p in triple if p is not winner]
        # Позиция победителя зависит от id, а не от скора и порядка поиска.
        position = sum(p["id"] for p in triple) % 3
        products = losers[:position] + [winner] + losers[position:]
        return {"query": query, "products": products, "winner_id": winner["id"]}
    raise ValueError(
        f"по запросу «{query}» не нашлось трёх товаров с КБЖУ, где лучший опережает "
        f"второго на {MIN_WINNER_GAP} и больше: попробуй другой запрос — другую категорию или более общее название, например «творог»"
    )


def check_round(ids: list[int], choice_id: int) -> None:
    """Проверка id раунда и выбора до запросов за товарами."""
    if len(ids) != 3:
        raise ValueError(f"в раунде должно быть ровно 3 товара, передано {len(ids)}")
    if len(set(ids)) != 3:
        raise ValueError(f"товары в раунде повторяются: {ids}, нужны 3 разных id")
    if choice_id not in ids:
        raise ValueError(f"выбранный товар {choice_id} не из раунда: выбери один из {ids}")


def judge_round(products: list[dict], choice_id: int) -> dict:
    check_round([p["id"] for p in products], choice_id)
    described = [describe_product(p) for p in products]
    best = max(p["score"] for p in described)
    leaders = [p for p in described if p["score"] == best]
    if len(leaders) > 1:
        raise ValueError(f"у товаров {[p['id'] for p in leaders]} одинаковый лучший скор: победителя нет")
    winner_id = leaders[0]["id"]
    return {
        "correct": choice_id == winner_id,
        "winner_id": winner_id,
        "scores": {p["id"]: p["score"] for p in described},
    }
