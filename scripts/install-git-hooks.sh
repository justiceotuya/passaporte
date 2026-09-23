#!/usr/bin/env bash
# Point this clone at repo-local hooks (does not touch ~/.gitconfig).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
git config --local core.hooksPath .githooks
chmod +x .githooks/prepare-commit-msg .githooks/commit-msg
echo "Installed core.hooksPath=.githooks (local only)"
