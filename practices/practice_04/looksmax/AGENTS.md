# Looksmax Grocery: правила для агента

Браузерная игра про looksmaxxing на продуктах ВкусВилла. Что и как должно работать — в `docs/requirements.md`.

## Источники

- Контракт, формулы, ранги и ошибки: `docs/requirements.md`.
- Данные о товарах (id, название, цена, КБЖУ): только MCP-сервер `vkusvill`. Не выдумывай товары, id и КБЖУ.
- Фикстуры для тестов сохраняй из реальных ответов MCP `vkusvill` в `tests/fixtures/` целиком, не урезая структуру.

## Проверка

- Единственная команда проверки: `sh scripts/check.sh`. Hook запускает её после каждой правки файла и возвращает результат тебе.
- Тесты не ходят в сеть: ответы ВкусВилла в тестах — сохранённые реальные фикстуры из `tests/fixtures/`.
- Python запускай как `.venv/bin/python`. Зависимости — `requirements.txt`.

## Как работать

- Код в `core/` и `server.py` пиши по skill `test-driven-development`: сначала падающий тест, потом код.
- Интерфейс в `web/` делай по skill `frontend-design`. Проверяй вёрстку глазами: `node tools/screenshot.mjs out.png ШИРИНА ВЫСОТА [JS-шаги]` при запущенном `.venv/bin/python serve.py` (порт 8765). Скриншоты клади в `docs/evidence/screenshots/`.
- Перед изменением кода прочитай `docs/style-guide.md`.

## Нельзя без поручения

- Менять `docs/requirements.md`, `scripts/check.sh`, `.claude/`, `.mcp.json`.
- Ослаблять проверку: удалять тесты, ставить `skip`, глушить ошибки ради зелёного результата.
- Делать `git commit` и `git push`: коммитит человек после приёмки.
- Вызывать инструменты ВкусВилла, требующие авторизации (`vkusvill_orders_history`, `vkusvill_product_lp`).

## Структура

```
core/kbju.py         парсер КБЖУ
core/scoring.py      скор, раунд, коины, ранг
core/vkusvill.py     клиент MCP ВкусВилла (JSON-RPC по HTTP)
server.py            свой MCP-сервер looksmax (stdio)
serve.py             раздаёт web/ и проксирует POST /api/cart во ВкусВилл
scripts/build_rounds.py  собирает web/rounds.js из 10 запросов
web/                 игра: index.html, app.js, styles.css, rounds.js
tests/               unittest
```
