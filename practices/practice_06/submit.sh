#!/bin/sh
# Run outside the restricted agent sandbox with GitHub credentials configured.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
REPO=tarasxryak/ITMOv2
git -C "$ROOT" rev-parse --verify submit/practice_06 > /dev/null
git -C "$ROOT" push origin submit/practice_06:refs/heads/practice_06
if gh pr view practice_06 --repo "$REPO" --json url --jq .url; then
  exit 0
fi
gh pr create --repo "$REPO" --base main --head practice_06 \
  --title "Practice 6: аудит Mini Shop, модель угроз и защита AI-инструментов" \
  --body-file "$ROOT/practices/practice_06/PR.md"
