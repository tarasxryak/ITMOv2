#!/usr/bin/env bash
# Этот скрипт запускает OpenCode на временной копии каталога lab/demo.
# Причина: при запуске внутри git-репозитория OpenCode воспринимает весь
# репозиторий как проект, поэтому даже при external_directory: deny модель
# может читать файлы вроде lab/REFERENCE.md. Запуск копии вне репозитория
# ограничивает границы проекта и блокирует чтение вне demo.

set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: $0 \"question\" [output-file]" >&2
  exit 1
fi

QUESTION=$1
OUTFILE=${2-}

# Разрешаем пути относительно расположения этого скрипта
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
DEMO_SRC="$SCRIPT_DIR/demo"

if [[ ! -d "$DEMO_SRC" ]]; then
  echo "Ошибка: каталог demo не найден по пути $DEMO_SRC" >&2
  exit 1
fi

# Подготавливаем рабочий временный каталог
WORK_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT INT TERM

# Если указан OUTFILE, до смены каталога делаем путь абсолютным и создаём
# его родительскую директорию. Это предотвращает запись в временный каталог
# и последующее удаление файла обработчиком trap.
if [[ -n "${OUTFILE}" ]]; then
  # Превратить относительный путь в абсолютный относительно текущего каталога вызова
  if [[ "${OUTFILE}" != /* ]]; then
    OUTFILE="$PWD/$OUTFILE"
  fi
  # Создать родительский каталог
  mkdir -p -- "$(dirname -- "$OUTFILE")"
fi

# Копируем demo во временный каталог, исключая __pycache__
mkdir -p "$WORK_DIR/demo"
rsync -a --exclude "__pycache__/" "$DEMO_SRC/" "$WORK_DIR/demo/"

cd "$WORK_DIR/demo"

RUN_CMD=(opencode run --agent local-guide --model ollama/itmo-agent "$QUESTION")

if [[ -n "${OUTFILE}" ]]; then
  # Если указан OUTFILE, вывод записывается в него (путь уже абсолютный)
  "${RUN_CMD[@]}" < /dev/null | tee "$OUTFILE"
else
  "${RUN_CMD[@]}" < /dev/null
fi
