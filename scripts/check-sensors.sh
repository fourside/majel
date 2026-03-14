#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/sensors"
echo "=== sensors: fmt ==="
uvx ruff format --check .
echo "=== sensors: lint ==="
uvx ruff check .
echo "=== sensors: type ==="
uvx ty check --python-version 3.12 .
