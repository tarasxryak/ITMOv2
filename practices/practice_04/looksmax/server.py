from mcp.server.fastmcp import FastMCP

from core.rounds import build_round as make_round
from core.rounds import check_query, check_round, describe_product
from core.rounds import judge_round as judge
from core.vkusvill import VkusVillClient

SEARCH_LIMIT = 10


def create_server(client: VkusVillClient) -> FastMCP:
    # INFO пишет в stderr строку на каждый запрос; в логах клиента это только шум.
    mcp = FastMCP("looksmax", log_level="WARNING")

    @mcp.tool()
    def score_product(product_id: int) -> dict:
        """Looksmax-скор товара ВкусВилла: id, название, КБЖУ на 100 г и белки × 4 / ккал."""
        return describe_product(_product_details(client, product_id))

    @mcp.tool()
    def build_round(query: str) -> dict:
        """Раунд из поиска ВкусВилла: 3 товара одной категории с КБЖУ и скором и winner_id."""
        check_query(query)
        return make_round(query, client.search(query, SEARCH_LIMIT))

    @mcp.tool()
    def judge_round(product_ids: list[int], choice_id: int) -> dict:
        """Судит выбор игрока: верно ли, winner_id и скоры трёх товаров по их product_details."""
        check_round(product_ids, choice_id)
        return judge([_product_details(client, product_id) for product_id in product_ids], choice_id)

    return mcp


def _product_details(client: VkusVillClient, product_id: int) -> dict:
    if product_id <= 0:
        raise ValueError(f"product_id должен быть больше нуля, передано {product_id}: возьми id товара из поиска")
    try:
        return client.product_details(product_id)
    except ValueError as e:
        raise ValueError(f"товар {product_id} не найден во ВкусВилле ({e}): проверь product_id") from e


if __name__ == "__main__":
    create_server(VkusVillClient()).run("stdio")
