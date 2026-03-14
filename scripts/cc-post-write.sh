#!/usr/bin/env bash
# Claude Code post-write hook: format and lint the saved file
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

root="$(git rev-parse --show-toplevel)"
rel="${FILE_PATH#"$root/"}"

case "$rel" in
  app/*)
    cd "$root/app"
    deno fmt "$FILE_PATH" 2>/dev/null
    deno lint "$FILE_PATH" 2>&1
    ;;
  sensors/*.py)
    cd "$root/sensors"
    uvx ruff format "$FILE_PATH" 2>/dev/null
    uvx ruff check "$FILE_PATH" 2>&1
    ;;
esac
