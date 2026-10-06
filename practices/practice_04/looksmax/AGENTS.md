# Looksmax Grocery: правила для агента

Браузерное приложение с тремя играми: дуэль «где больше белка» и корзина на бюджет на продуктах ВкусВилла, а также кликер с общей валютой криптошекелей и магазином тем. Что и как должно работать — в `docs/requirements.md`.

## Источники

- Контракт, формулы, ранги и ошибки: `docs/requirements.md`.
- Данные о товарах (id, название, цена, КБЖУ): только MCP-сервер `vkusvill`. Не выдумывай товары, id и КБЖУ.
- Каталог игр: `web/public/catalog.json`, собирается `scripts/build_catalog.py` из ответов MCP `vkusvill`. Руками не правь.
- Фикстуры для тестов сохраняй из реальных ответов MCP `vkusvill` в `tests/fixtures/` целиком, не урезая структуру.

## Проверка

- Единственная команда проверки: `sh scripts/check.sh` (тесты Python, типы и тесты фронтенда). Hook запускает её после каждой правки файла и возвращает результат тебе.
- Тесты не ходят в сеть: ответы ВкусВилла в тестах — сохранённые реальные фикстуры из `tests/fixtures/`.
- Python запускай как `.venv/bin/python`. Зависимости — `requirements.txt`. Фронтенд: `npm --prefix web ci`.

## Как работать

- Код в `core/`, `server.py`, `serve.py` и игровую логику в `web/src/lib/` пиши по skill `test-driven-development`: сначала падающий тест, потом код.
- Интерфейс в `web/src/` делай по skill `frontend-design`. Компоненты shadcn бери через MCP `shadcn` (`get_component`), не пиши их руками (`docs/style-guide.md`, п. 6).
- Вёрстку проверяй глазами: `npm --prefix web run build`, затем `.venv/bin/python serve.py` (порт 8765) и `node tools/screenshot.mjs out.png ШИРИНА ВЫСОТА [JS-шаги]`. С `LOOKSMAX_URL=http://127.0.0.1:8765/?seed=7` раунды воспроизводимы. Скриншоты клади в `docs/evidence/screenshots/`.
- Radix Tabs переключаются по `mousedown`, а не по `click`: в JS-шагах скриншота шли `dispatchEvent(new MouseEvent('mousedown', {bubbles: true, button: 0}))`.
- Перед изменением кода прочитай `docs/style-guide.md`.

## Нельзя без поручения

- Менять `docs/requirements.md`, `scripts/check.sh`, `.claude/`, `.mcp.json`.
- Ослаблять проверку: удалять тесты, ставить `skip`, глушить ошибки ради зелёного результата.
- Делать `git commit` и `git push`: коммитит человек после приёмки.
- Вызывать инструменты ВкусВилла, требующие авторизации (`vkusvill_orders_history`, `vkusvill_product_lp`).

## Структура

```
core/kbju.py             парсер КБЖУ
core/scoring.py          скор, награда за ответ, ранг
core/rounds.py           раунд по поисковому запросу, суд раунда
core/catalog.py          запись каталога игр: масса порции, проверка каталога
core/vkusvill.py         клиент MCP ВкусВилла (JSON-RPC по HTTP)
server.py                свой MCP-сервер looksmax (stdio)
serve.py                 раздаёт web/dist и проксирует POST /api/cart во ВкусВилл
scripts/build_catalog.py собирает web/public/catalog.json из поиска ВкусВилла
tools/shadcn_fetch.py    забирает компоненты shadcn через MCP shadcn
web/src/lib/             игровые правила: дуэль, корзина, кликер, профиль и кошелёк, темы, каталог
web/src/games/           экраны игр «Дуэль» и «Корзина на бюджет»
web/src/components/      общие компоненты; ui/ — shadcn
tests/                   unittest; тесты фронтенда лежат рядом с кодом (*.test.ts)
```
