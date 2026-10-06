#!/bin/sh
# Единственная проверка проекта: unit-тесты Python, затем типы и unit-тесты фронтенда (web/).
set -eu
cd "$(dirname "$0")/.."
PY=.venv/bin/python
[ -x "$PY" ] || PY=python3
"$PY" -m unittest discover -s tests -t . 2>&1
[ -d web/node_modules ] || npm --prefix web ci --no-audit --no-fund
npm --prefix web run --silent check
echo "check.sh: OK"
