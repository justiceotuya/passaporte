#!/usr/bin/env bash
# Full-book classify + extract for aluno + professor (continues past calibration 10–40).
# Rasters must already exist (scripts/rasterize-all.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p extracted/logs extracted/passaporte-aluno extracted/passaporte-professor

# Backup calibration pages.json once
if [[ -f extracted/passaporte-aluno/pages.json && ! -f extracted/passaporte-aluno/pages.calib-10-40.json ]]; then
  cp extracted/passaporte-aluno/pages.json extracted/passaporte-aluno/pages.calib-10-40.json
  echo "Backed up aluno pages.json → pages.calib-10-40.json"
fi
if [[ -f extracted/passaporte-professor/pages.json && ! -f extracted/passaporte-professor/pages.calib-10-40.json ]]; then
  cp extracted/passaporte-professor/pages.json extracted/passaporte-professor/pages.calib-10-40.json
  echo "Backed up professor pages.json → pages.calib-10-40.json"
fi

# Load ANTHROPIC_API_KEY from .env if present
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then
  echo "error: ANTHROPIC_API_KEY missing" >&2
  exit 1
fi

STAGE="${1:-all}"
LOG_DIR="$ROOT/extracted/logs"
mkdir -p "$LOG_DIR"

run_classify() {
  local book="$1"
  echo "== classify $book (all pages, merge + skip existing) =="
  (cd pipeline && uv run python classify.py --book "$book") | tee "$LOG_DIR/classify-$book.log"
}

run_extract_aluno() {
  echo "== extract aluno (all exercise pages) =="
  (cd pipeline && uv run python extract.py --book passaporte-aluno) | tee "$LOG_DIR/extract-aluno.log"
}

run_extract_prof() {
  echo "== extract_key professor (all answer_key pages) =="
  (cd pipeline && uv run python extract_key.py --book passaporte-professor) | tee "$LOG_DIR/extract-professor.log"
}

case "$STAGE" in
  classify)
    run_classify passaporte-aluno
    run_classify passaporte-professor
    ;;
  extract)
    run_extract_aluno
    run_extract_prof
    ;;
  all)
    run_classify passaporte-aluno
    run_classify passaporte-professor
    run_extract_aluno
    run_extract_prof
    echo ""
    echo "Next: note run ids from logs, then:"
    echo "  cd pipeline && uv run python join.py --aluno-run ../extracted/passaporte-aluno/<RUN> --professor-run ../extracted/passaporte-professor/<RUN> --report ../extracted/join_report.md"
    echo "  pnpm pipeline:hints && pnpm pipeline:crop"
    ;;
  *)
    echo "Usage: $0 [all|classify|extract]" >&2
    exit 2
    ;;
esac
