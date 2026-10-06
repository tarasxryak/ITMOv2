#!/bin/sh
# Единственная проверка проекта: unit-тесты Python и синтаксис JS игры.
set -eu
cd "$(dirname "$0")/.."
PY=.venv/bin/python
[ -x "$PY" ] || PY=python3
"$PY" -m unittest discover -s tests -t . 2>&1
for f in web/*.js; do
  [ -f "$f" ] && node --check "$f"
done
node --test tests/js/
echo "check.sh: OK"
