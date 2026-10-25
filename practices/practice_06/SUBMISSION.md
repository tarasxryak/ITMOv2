# ДЗ № 6: пакет сдачи

- [Модель угроз и схема](THREAT_MODEL.md).
- [REPORT_01 — проблемы до исправлений](REPORT_01.md).
- [REPORT_02 — исправления, повторные атаки и выводы](REPORT_02.md).
- [Системный промпт независимого судьи](judge-system-prompt.md).
- [Описание PR](PR.md).
- `lab/service.py`, `lab/test_security.py`, `lab/test_evidence.py` — защита и регрессии.
- `evidence/before/`, `evidence/after/` — исходник, парные атаки, входы planner и фактические результаты запусков.

## Проверка

Из корня репозитория:

```sh
make step6
make test
```

Без TCP-портов можно отдельно проверить логику, HTTP-parser через память и сохранённые доказательства:

```sh
cd practices/practice_06
python3 -m unittest discover -s lab -p test_service.py -v
python3 -m unittest discover -s lab -p test_security.py -v
python3 -m unittest discover -s lab -p test_evidence.py -v
python3 tools/verify_evidence.py
```

Это диагностика для ограниченной среды, а не замена полного `make step6`.

## Воспроизведение до/после

```sh
python3 tools/replay_attacks.py --source evidence/before/service.py.txt --output evidence/before
python3 tools/replay_attacks.py --output evidence/after
python3 tools/verify_evidence.py
```

Каждая атака получает новый экземпляр Shop и только синтетические файлы его sandbox. Даже опасное удаление в исходном сервисе не затрагивает другие данные. Никаких запросов к внешним целям.

## Реальные planner и судья

В `opencode.json` агенты `shop-planner` и `threat-judge` не имеют инструментов. Root-провайдер VseLLM использует ключ из окружения, секрет в файл не записывается. При необходимости выбрать другую настроенную модель через `--model`; одна и та же модель должна использоваться для всех четырёх planner-прогонов.

```sh
python3 tools/run_models.py --phase before --model ollama/qwen3.5:4b
python3 tools/run_models.py --phase after --model ollama/qwen3.5:4b
python3 tools/build_judge_input.py
python3 tools/run_models.py --phase after --model ollama/qwen3.5:4b --judge
```

`run_models.py` сохраняет модель, задачу, хеш system prompt, точный ответ без reasoning, извлечённый JSON и результат его исполнения в новом учебном Shop. Некорректный ответ не ремонтируется; отсутствие ответа записывается как unavailable. Прямые сценарии executor не выдаются за ответы LLM. Завершённые JSON-ответы не получены: VseLLM вернул 401, локальный Qwen — таймаут/отсутствие text-ответа; после успешного прогона нужно обновить REPORT_02 по фактическим данным.

## Сервис и демонстрация

```sh
make -C lab run
```

Сервис слушает только `127.0.0.1:8066`. Login Alice → свой профиль/чек/покупка работают; чужой профиль, поддельный X-Role, traversal и AI delete/export запрещены. Вредоносный отзыв выводится текстом. Staff экспортирует профили по своей сессии без X-Role.

PR следует открыть отдельной веткой `practice_06` в своём форке. Публикация не считается выполненной, пока нет настоящего URL PR. Задания № 5 и № 6 должны оставаться отдельными изменениями.

## Ветка и публикация

Подготовлена отдельная локальная ветка `submit/practice_06` от `main` и рабочее дерево `/tmp/itmo-hw6-submit`; исходные незакоммиченные изменения ДЗ № 5 сохранены. Ветка ДЗ № 6 не включает их. После настройки доступа к GitHub можно выполнить из исходного корня `sh practices/practice_06/submit.sh`: будет отправлена ветка `practice_06` и открыт PR в `main` с готовым описанием. Проверка TCP в CI — `.github/workflows/homework-06.yml`. Сама публикация требует успешного push и настоящего URL PR.

Публикация выполнена: https://github.com/tarasxryak/ITMOv2/pull/6. Повторный полный прогон `make step6` и `make test` вне песочницы успешен: 43 теста Mini Shop и проверка 23 парных сценариев.

GitHub Actions `security` прошёл: https://github.com/tarasxryak/ITMOv2/actions/runs/40214803941/job/121233507842 (полный `make step6` и `make test`).
