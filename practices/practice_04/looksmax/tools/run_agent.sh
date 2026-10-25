#!/bin/sh
# Запуск: tools/run_agent.sh ИМЯ "поручение"
# Headless-сессия Claude Code в корне проекта: правила, skills, MCP и hook из проекта.
# Лог сессии (stream-json) сохраняется в docs/evidence/raw/ИМЯ.jsonl, затем печатается сводка.
P=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$P/docs/evidence/raw"
cd "$P" || exit 1
claude -p "$2" --output-format stream-json --verbose --include-hook-events \
  --permission-mode acceptEdits --strict-mcp-config --mcp-config .mcp.json \
  < /dev/null > "docs/evidence/raw/$1.jsonl" 2> "docs/evidence/raw/$1.stderr"
echo "exit $?"
python3 "$P/tools/evidence_summary.py" "docs/evidence/raw/$1.jsonl"
