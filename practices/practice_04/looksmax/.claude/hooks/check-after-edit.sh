#!/bin/sh
# PostToolUse: после правки файла запускает scripts/check.sh и возвращает результат агенту.
# PASS уходит агенту как additionalContext, FAIL — как decision=block с хвостом вывода.
cd "$CLAUDE_PROJECT_DIR" || exit 0
file=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))' 2>/dev/null)
out=$(sh scripts/check.sh 2>&1)
code=$?
status=PASS
[ $code -eq 0 ] || status=FAIL
printf '%s %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$status" "${file#$CLAUDE_PROJECT_DIR/}" >> docs/evidence/hook-runs.log
printf '%s\n' "$out" | tail -n 25 | python3 -c '
import json, sys
tail = sys.stdin.read()
status, code = sys.argv[1], sys.argv[2]
if status == "PASS":
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "PostToolUse",
        "additionalContext": "scripts/check.sh: PASS\n" + tail}}, ensure_ascii=False))
else:
    print(json.dumps({"decision": "block",
        "reason": "scripts/check.sh: FAIL (exit %s)\n%s" % (code, tail)}, ensure_ascii=False))
' "$status" "$code"
exit 0
