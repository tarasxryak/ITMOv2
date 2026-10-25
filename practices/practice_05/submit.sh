#!/bin/sh
# Запускать на машине с доступом к GitHub после gh auth login.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
REPO=tarasxryak/ITMOv2
BRANCH=submit/practice_05
git -C "$ROOT" rev-parse --verify "$BRANCH" > /dev/null
gh auth status --hostname github.com
git -C "$ROOT" push origin "$BRANCH:refs/heads/practice_05"
if gh pr view practice_05 --repo "$REPO" --json url --jq .url; then
  exit 0
fi
gh pr create --repo "$REPO" --base practice_04 --head practice_05 \
  --title "Practice 5: достижения Looksmax Grocery по Spec-Driven Development" \
  --body-file "$ROOT/practices/practice_05/PR.md"
