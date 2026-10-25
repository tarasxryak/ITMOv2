"""Собирает web/public/catalog.json: каталог товаров ВкусВилла для обеих игр.

У MCP ВкусВилла нет выгрузки всего ассортимента, только поиск. Поэтому каталог — это объединение
результатов по списку запросов из всех отделов магазина. Чем больше запросов, тем шире выбор в играх.

Запуск (нужен доступ к https://mcp.vkusvill.ru): .venv/bin/python scripts/build_catalog.py [--no-details]
"""
import argparse
import json
import sys
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent.parent
# Запуск как «python scripts/build_catalog.py» кладёт в sys.path только scripts/.
sys.path.insert(0, str(ROOT))

from core.catalog import build_catalog, validate_catalog  # noqa: E402
from core.vkusvill import VkusVillClient, http_transport  # noqa: E402
from server import SEARCH_LIMIT  # noqa: E402

OUTPUT = ROOT / "web" / "public" / "catalog.json"

QUERIES = [
    # молочное и яйца
    "творог", "йогурт", "кефир", "молоко", "сметана", "сливки", "масло сливочное", "сыр", "плавленый сыр",
    "моцарелла", "брынза", "творожный сыр", "яйца", "сырники", "ряженка", "простокваша", "айран",
    "творожный десерт", "глазированный сырок", "греческий йогурт", "скир", "пудинг",
    # мясо и птица
    "курица", "филе грудки", "индейка", "говядина", "свинина", "фарш", "баранина", "утка", "печень",
    "сосиски", "колбаса", "ветчина", "бекон", "сардельки", "котлеты", "пельмени", "вареники", "наггетсы",
    "шашлык", "стейк", "буженина", "паштет", "мясные снеки",
    # рыба и морепродукты
    "рыба", "лосось", "форель", "сельдь", "треска", "минтай", "тунец", "креветки", "кальмар", "икра",
    "крабовые палочки", "рыбные консервы", "горбуша", "скумбрия", "осьминог", "мидии",
    # овощи, фрукты, орехи
    "картофель", "помидоры", "огурцы", "морковь", "капуста", "лук", "брокколи", "перец", "грибы", "зелень",
    "салат", "авокадо", "кабачок", "свёкла", "тыква", "кукуруза", "яблоки", "бананы", "апельсины",
    "мандарины", "виноград", "груши", "клубника", "ягоды", "киви", "манго", "сухофрукты", "орехи",
    "миндаль", "фундук", "семечки", "арахис", "финики", "изюм", "кешью",
    # выпечка и сладкое
    "хлеб", "батон", "лаваш", "булочка", "круассан", "печенье", "вафли", "торт", "пирожное", "шоколад",
    "конфеты", "мороженое", "батончик", "протеиновый батончик", "мармелад", "зефир", "халва", "мёд",
    "варенье", "пряники", "кекс", "хлебцы", "гранола",
    # снеки
    "чипсы", "сухарики", "попкорн", "снеки", "крекеры", "орехи в глазури",
    # напитки
    "сок", "лимонад", "смузи", "компот", "протеиновый коктейль", "квас", "молочный коктейль", "какао",
    "овсяное молоко", "миндальное молоко", "соевое молоко", "кисель",
    # бакалея
    "гречка", "рис", "овсянка", "макароны", "мюсли", "хлопья", "булгур", "чечевица", "нут", "фасоль",
    "мука", "сахар", "масло подсолнечное", "оливковое масло", "соус", "кетчуп", "майонез", "горчица",
    "арахисовая паста", "кунжут", "семена чиа", "отруби", "киноа", "кускус", "консервы овощные", "горошек",
    # готовая еда
    "суп", "готовый салат", "паста", "пицца", "бургер", "сэндвич", "роллы", "блины", "каша", "омлет",
    "хумус", "плов", "лазанья", "гречка с курицей", "запеканка", "голубцы", "тефтели", "драники",
    "оладьи", "сырная тарелка", "боул", "шаурма",
    # спортпит и здоровое питание
    "протеин", "высокобелковый", "без сахара", "веган", "тофу", "темпе", "соевое мясо",
]

Search = Callable[[str], list[dict]]
FetchDetails = Callable[[int], dict]
OnError = Callable[[str, Exception], None]


def collect_catalog(
    queries: list[str],
    search: Search,
    fetch_details: FetchDetails | None = None,
    on_error: OnError | None = None,
) -> list[dict]:
    """Каталог из поиска по всем запросам. Упавший запрос уходит в on_error и не останавливает сборку."""
    found = []
    for query in queries:
        try:
            found.extend(search(query))
        except (ValueError, OSError) as error:
            if on_error is None:
                raise
            on_error(query, error)
    return build_catalog(found, fetch_details)


def render_catalog_json(catalog: list[dict]) -> str:
    """Один товар на строку: каталог удобно смотреть в git diff."""
    lines = [json.dumps(p, ensure_ascii=False, separators=(",", ":")) for p in catalog]
    return "[\n" + ",\n".join(lines) + "\n]\n"


def write_catalog(catalog: list[dict], output: Path) -> None:
    """Пишет каталог, только если он годится для игр: битый файл не должен затереть рабочий."""
    problems = validate_catalog(catalog)
    if problems:
        raise ValueError("каталог не прошёл проверку:\n- " + "\n- ".join(problems))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_catalog_json(catalog), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--no-details", action="store_true", help="не ходить за product_details ради граммовки")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    client = VkusVillClient(http_transport)
    done = []

    def search(query: str) -> list[dict]:
        items = client.search(query, SEARCH_LIMIT)
        done.append(query)
        print(f"[{len(done)}/{len(QUERIES)}] {query}: {len(items)}", flush=True)
        return items

    catalog = collect_catalog(
        QUERIES,
        search,
        fetch_details=None if args.no_details else client.product_details,
        on_error=lambda query, error: print(f"запрос «{query}» пропущен: {error}", file=sys.stderr),
    )
    try:
        write_catalog(catalog, args.output)
    except ValueError as error:
        sys.exit(f"{error}\nСтарый каталог не тронут.")
    with_portion = sum(1 for p in catalog if p["portion"])
    print(f"{len(catalog)} товаров ({with_portion} с порцией для корзины) → {args.output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
