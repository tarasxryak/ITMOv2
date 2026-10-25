# Подтверждения применения среды агента

Короткая сводка по девяти headless-сессиям Claude Code, запущенным `tools/run_agent.sh` в корне проекта. Сводка собрана из полных логов сессий (stream-json), которые остались у автора и в историю репозитория не входят в итоговую версию. Локальные пути заменены на относительные.

## Сессия 01: Правила проекта и MCP

Лог: `01-rules-and-mcp.jsonl`, ходов агента 5.

- MCP при старте: vkusvill: connected, looksmax: failed
- Skill загружен вызовом `Skill`: нет
- Hook `scripts/check.sh` после правок: PASS 0, FAIL 0; правок файлов 0
- Вызовы MCP tools:
  - `vkusvill.vkusvill_products_search` {"q": "творог", "limit": 3, "mode": "full"}: ок. найдено товаров: 127
- Итог сессии: **Команда проверки:** `sh scripts/check.sh`. Hook сам запускает её после каждой правки файла. **Без поручения нельзя:**

## Сессия 02: Фича A: парсер КБЖУ и скор

Лог: `02-feature-a-kbju-scoring.jsonl`, ходов агента 43.

- MCP при старте: vkusvill: connected, looksmax: failed
- Skill загружен вызовом `Skill`: test-driven-development
- Hook `scripts/check.sh` после правок: PASS 13, FAIL 18; правок файлов 31
- Вызовы MCP tools:
  - `vkusvill.vkusvill_products_search` {"q": "творог", "limit": 5, "mode": "full"}: ок. найдено товаров: 127
  - `vkusvill.vkusvill_products_search` {"q": "чипсы", "limit": 5, "mode": "full"}: ок. найдено товаров: 109
- Итог сессии: Готово: парсер и скоринг написаны по TDD, `sh scripts/check.sh` — **OK, 12 тестов, все зелёные**. **Фикстуры:** `tests/fixtures/search_tvorog.json` и `search_chips.json` — полные ответы `vkusvill_products_search` (mode=full, limi…

## Сессия 03: Клиент ВкусВилла и раунды

Лог: `03-vkusvill-client-and-rounds.jsonl`, ходов агента 35.

- MCP при старте: vkusvill: connected, looksmax: failed
- Skill загружен вызовом `Skill`: test-driven-development
- Hook `scripts/check.sh` после правок: PASS 10, FAIL 5; правок файлов 15
- Отказов по разрешениям (сложные команды Bash и подобное): 1
- Вызовы MCP tools:
  - `vkusvill.vkusvill_product_details` {"id": 27695}: ок. Творог 5%, 180&nbsp;г
  - `vkusvill.vkusvill_product_details` {"id": 999999999}: ошибка входа (ok=false). invalid_input: Некорректный id товара
  - `vkusvill.vkusvill_cart_link_create` {"products": [{"xml_id": 27695, "q": 1}]}: ок. ссылка на корзину получена
- Итог сессии: Готово, `sh scripts/check.sh` проходит: 42 теста OK (было 12). Ничего не закоммичено. ## Что сделано

## Сессия 04: Свой MCP-сервер looksmax

Лог: `04-own-mcp-server.jsonl`, ходов агента 40.

- MCP при старте: vkusvill: connected, looksmax: failed
- Skill загружен вызовом `Skill`: test-driven-development
- Hook `scripts/check.sh` после правок: PASS 6, FAIL 15; правок файлов 21
- Отказов по разрешениям (сложные команды Bash и подобное): 2
- Итог сессии: Сервер `looksmax` готов, `sh scripts/check.sh` проходит: 54 теста OK, вывод без шума. **Что сделано**

## Сессия 05: Демо своего MCP

Лог: `05-own-mcp-demo.jsonl`, ходов агента 16.

- MCP при старте: vkusvill: connected, looksmax: connected
- Skill загружен вызовом `Skill`: нет
- Hook `scripts/check.sh` после правок: PASS 0, FAIL 0; правок файлов 0
- Отказов по разрешениям (сложные команды Bash и подобное): 1
- Вызовы MCP tools:
  - `looksmax.score_product` {"product_id": 27695}: ок. {"id": 27695, "xml_id": 27695, "name": "Творог 5%, 180 г", "kbju": {"protein": 16.0, "fat": 5.0, "carbs": 3.0…
  - `looksmax.score_product` {"product_id": -5}: ошибка. Error executing tool score_product: product_id должен быть больше нуля, передано -5: возьми id товара из поис…
  - `looksmax.score_product` {"product_id": 999999999}: ошибка. Error executing tool score_product: товар 999999999 не найден во ВкусВилле (ВкусВилл вернул ошибку vkusvill_p…
  - `looksmax.build_round` {"query": "курица"}: ошибка. Error executing tool build_round: по запросу «курица» не нашлось трёх товаров с КБЖУ, где лучший опережает вт…
  - `vkusvill.vkusvill_products_search` {"q": "курица", "limit": 10, "mode": "custom", "fields": ["id", "name", "proper…: ок. найдено товаров: 509
  - `looksmax.build_round` {"query": ""}: ошибка. Error executing tool build_round: поисковый запрос пуст: укажи категорию, например «творог»
  - `looksmax.build_round` {"query": "творог"}: ок. {"query": "творог", "products": [{"id": 27695, "xml_id": 27695, "name": "Творог 5%, 180 г", "kbju": {"protein…
  - `looksmax.judge_round` {"product_ids": [27695, 185, 69259], "choice_id": 27695}: ок. {"correct": false, "winner_id": 69259, "scores": {"27695": 0.529, "185": 0.529, "69259": 0.644}}
  - `looksmax.judge_round` {"product_ids": [27695, 185], "choice_id": 27695}: ошибка. Error executing tool judge_round: в раунде должно быть ровно 3 товара, передано 2
- Итог сессии: 7) Ошибка: «в раунде должно быть ровно 3 товара, передано 2». ## Итог

## Сессия 06: Изменение контракта: мясо и рыба

Лог: `06-contract-change-meat.jsonl`, ходов агента 36.

- MCP при старте: vkusvill: connected, looksmax: connected
- Skill загружен вызовом `Skill`: test-driven-development
- Hook `scripts/check.sh` после правок: PASS 3, FAIL 7; правок файлов 11
- Отказов по разрешениям (сложные команды Bash и подобное): 3
- Вызовы MCP tools:
  - `vkusvill.vkusvill_products_search` {"q": "курица", "limit": 10, "mode": "full"}: ок. большой ответ, агент сохранил его в файл и прочитал оттуда
  - `looksmax.build_round` {"query": "курица"}: ошибка. Error executing tool build_round: по запросу «курица» не нашлось трёх товаров с КБЖУ, где лучший опережает вт…
- Итог сессии: Готово, `sh scripts/check.sh` проходит: 58 тестов, OK. Но вызов MCP `looksmax build_round(query='курица')` в этой сессии вернул старую ошибку, потому что сервер запущен до правок и держит в памяти прежний код: > по запросу «куриц…

## Сессия 07: Сборка раундов игры

Лог: `07-build-rounds.jsonl`, ходов агента 32.

- MCP при старте: vkusvill: connected, looksmax: connected
- Skill загружен вызовом `Skill`: test-driven-development
- Hook `scripts/check.sh` после правок: PASS 2, FAIL 3; правок файлов 5
- Отказов по разрешениям (сложные команды Bash и подобное): 2
- Вызовы MCP tools:
  - `looksmax.build_round` {"query": "творог"}: ок. {"query": "творог", "products": [{"id": 27695, "xml_id": 27695, "name": "Творог 5%, 180 г", "kbju": {"protein…
  - `looksmax.build_round` {"query": "курица"}: ок. {"query": "курица", "products": [{"id": 488, "xml_id": 488, "name": "Филе грудки цыпленка-бройлера", "kbju": …
  - `looksmax.build_round` {"query": "рыба"}: ок. {"query": "рыба", "products": [{"id": 16589, "xml_id": 16589, "name": "Форель малосоленая ломтики, 150 г", "k…
  - `looksmax.build_round` {"query": "чипсы"}: ок. {"query": "чипсы", "products": [{"id": 81955, "xml_id": 81955, "name": "Чипсы куриные с перцем", "kbju": {"pr…
  - `looksmax.build_round` {"query": "шоколад"}: ок. {"query": "шоколад", "products": [{"id": 102608, "xml_id": 102608, "name": "Шоколад горький 85%, 90 г", "kbju…
  - `looksmax.build_round` {"query": "йогурт"}: ок. {"query": "йогурт", "products": [{"id": 16026, "xml_id": 16026, "name": "Йогурт греческий \"Черника\" 3,4%", …
  - `looksmax.build_round` {"query": "колбаса"}: ок. {"query": "колбаса", "products": [{"id": 95607, "xml_id": 95607, "name": "Колбаса вареная со сливками категор…
  - `looksmax.build_round` {"query": "протеиновый батончик"}: ок. {"query": "протеиновый батончик", "products": [{"id": 108493, "xml_id": 108493, "name": "Батончик протеиновый…
  - `looksmax.build_round` {"query": "сыр"}: ок. {"query": "сыр", "products": [{"id": 43778, "xml_id": 43778, "name": "Сыр \"Российский\", 200 г", "kbju": {"p…
  - `looksmax.build_round` {"query": "напиток"}: ошибка. Error executing tool build_round: по запросу «напиток» не нашлось трёх товаров с КБЖУ, где лучший опережает в…
  - `looksmax.build_round` {"query": "протеиновый коктейль"}: ок. {"query": "протеиновый коктейль", "products": [{"id": 100471, "xml_id": 100471, "name": "Напиток кисломолочны…
  - `looksmax.build_round` {"query": "кефир"}: ок. {"query": "кефир", "products": [{"id": 20028, "xml_id": 20028, "name": "Кефир 1% в бутылке, 900 г", "kbju": {…
- Итог сессии: Готово: в `web/rounds.js` 10 раундов, `sh scripts/check.sh` проходит (66 тестов OK, `node --check web/rounds.js` OK, итог `check.sh: OK`). **10 категорий и победители** (каждую проверил через MCP `looksmax build_round`, скрипт по…

## Сессия 08: Фронтенд игры

Лог: `08-frontend.jsonl`, ходов агента 71.

- MCP при старте: vkusvill: connected, looksmax: connected
- Skill загружен вызовом `Skill`: frontend-design, test-driven-development, run
- Hook `scripts/check.sh` после правок: PASS 24, FAIL 14; правок файлов 40
- Отказов по разрешениям (сложные команды Bash и подобное): 10
- Правки файлов, закрытых правилами `AGENTS.md`: scripts/check.sh
- Итог сессии: Игра в `web/` готова. `sh scripts/check.sh` проходит: 66 Python-тестов и 52 JS-теста. Но в браузере я её не видел: запуск Chrome для скриншотов и `curl` требовали одобрения, которого в сессии не было. Вёрстку я вычитал вручную, к…

## Сессия 09: Правки: корзина, прокси, коины

Лог: `09-fixes-cart-proxy-coins.jsonl`, ходов агента 19.

- MCP при старте: vkusvill: connected, looksmax: connected
- Skill загружен вызовом `Skill`: test-driven-development, frontend-design
- Hook `scripts/check.sh` после правок: PASS 0, FAIL 0; правок файлов 0
- Отказов по разрешениям (сложные команды Bash и подобное): 1
- Итог сессии: You've hit your session limit · resets 7:50pm (Europe/Moscow)

