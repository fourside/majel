#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)/app"
echo "=== app: build ==="
deno task build
echo "=== app: fmt ==="
deno fmt --check
echo "=== app: lint ==="
deno lint
echo "=== app: test ==="
deno test --allow-read --allow-env src/ static/lib/ ui/
