"""Собирает web/rounds.js: 10 раундов игры из поиска ВкусВилла."""
import json
import sys
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent.parent
# Запуск как «python scripts/build_rounds.py» кладёт в sys.path только scripts/.
sys.path.insert(0, str(ROOT))

from core.rounds import build_round, describe_product  # noqa: E402
from core.vkusvill import VkusVillClient, http_transport  # noqa: E402
from server import SEARCH_LIMIT  # noqa: E402

# Каждый запрос проверен tool build_round сервера looksmax: раунд собирается.
QUERIES = [
    "творог",
    "курица",
    "рыба",
    "сыр",
    "йогурт",
    "колбаса",
    "чипсы",
    "шоколад",
    "протеиновый батончик",
    "протеиновый коктейль",
]
OUTPUT = ROOT / "web" / "rounds.js"

Search = Callable[[str], list[dict]]


def product_record(item: dict) -> dict:
    """Товар из поиска ВкусВилла → всё, что игра показывает на карточке."""
    record = describe_product(item)
    images = item.get("images") or []
    return {
        "id": record["id"],
        "xml_id": record["xml_id"],
        "name": record["name"],
        "price": item["price"]["current"],
        "url": item["url"],
        "image": images[0]["medium"] if images else None,
        "kbju": record["kbju"],
        "score": record["score"],
    }


def build_rounds(queries: list[str], search: Search) -> list[dict]:
    rounds = []
    for query in queries:
        items = search(query)
        round_ = build_round(query, items)
        by_id = {item["id"]: item for item in items}
        rounds.append({
            "query": query,
            "products": [product_record(by_id[p["id"]]) for p in round_["products"]],
            "winner_id": round_["winner_id"],
        })
    return rounds


def render_rounds_js(rounds: list[dict]) -> str:
    return "window.LOOKSMAX_ROUNDS = " + json.dumps(rounds, ensure_ascii=False, indent=2) + ";\n"


def main() -> None:
    client = VkusVillClient(http_transport)
    rounds = build_rounds(QUERIES, lambda query: client.search(query, SEARCH_LIMIT))
    OUTPUT.write_text(render_rounds_js(rounds), encoding="utf-8")
    for round_ in rounds:
        print(f"{round_['query']}: победитель {round_['winner_id']}")
    print(f"{len(rounds)} раундов → {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
