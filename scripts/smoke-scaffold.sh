#!/usr/bin/env bash
# Phase 0 exit suite — scaffold smoke checks
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail=0
check() {
  if eval "$2"; then
    echo "PASS  $1"
  else
    echo "FAIL  $1"
    fail=1
  fi
}

check "apps/web exists" "[[ -d apps/web ]]"
check "pipeline exists" "[[ -d pipeline ]]"
check "schema exists" "[[ -d schema ]]"
check "content exists" "[[ -d content ]]"
check "gold exists" "[[ -d gold ]]"
check ".gitignore excludes raw/" "grep -q '^raw/' .gitignore"
check ".gitignore excludes extracted/" "grep -q '^extracted/' .gitignore"
check ".gitignore excludes .env" "grep -qE '^\\.env' .gitignore"
check "raw/pdf/passaporte-aluno.pdf" "[[ -f raw/pdf/passaporte-aluno.pdf ]]"
check "raw/pdf/passaporte-professor.pdf" "[[ -f raw/pdf/passaporte-professor.pdf ]]"
check "raw/pdf/portugues-a-valer-1.pdf" "[[ -f raw/pdf/portugues-a-valer-1.pdf ]]"
check "pnpm-workspace.yaml" "[[ -f pnpm-workspace.yaml ]]"
check "pipeline pyproject" "[[ -f pipeline/pyproject.toml ]]"

if [[ "$fail" -ne 0 ]]; then
  echo "Phase 0 smoke FAILED"
  exit 1
fi
echo "Phase 0 smoke PASSED"
