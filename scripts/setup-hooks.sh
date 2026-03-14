#!/usr/bin/env bash
set -euo pipefail
root="$(git rev-parse --show-toplevel)"
ln -sf "$root/scripts/pre-push" "$root/.git/hooks/pre-push"
echo "✓ Installed pre-push hook"
