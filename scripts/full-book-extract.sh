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

kind_count() {
  local book="$1"
  local kind="$2"
  python3 -c "
import json, sys
book, kind = sys.argv[1], sys.argv[2]
pages = json.load(open(f'extracted/{book}/pages.json'))['pages']
print(sum(1 for p in pages if p.get('page_kind') == kind))
" "$book" "$kind"
}

json_page_count() {
  local run_dir="$1"
  ls -1 "$run_dir"/p-*.json 2>/dev/null | wc -l | tr -d ' '
}

latest_run_dir() {
  local book="$1"
  ls -1dt "extracted/$book"/20* 2>/dev/null | head -1 || true
}

assert_extract_complete() {
  local run_dir="$1"
  local expected="$2"
  local label="$3"
  local have
  if [[ -z "$run_dir" || ! -d "$run_dir" ]]; then
    echo "error: $label missing run dir" >&2
    exit 1
  fi
  have="$(json_page_count "$run_dir")"
  if [[ "$have" -lt "$expected" ]]; then
    echo "error: $label incomplete $have/$expected in $run_dir — refusing ALL DONE" >&2
    exit 1
  fi
  echo "$label complete $have/$expected → $run_dir"
}

run_extract_aluno() {
  local expected run_id="${EXTRACT_ALUNO_RUN:-}"
  expected="$(kind_count passaporte-aluno exercises)"
  echo "== extract aluno (expected $expected; run_id=${run_id:-new}) =="
  local args=(--book passaporte-aluno)
  if [[ -n "$run_id" ]]; then
    args+=(--run-id "$run_id")
  fi
  (cd pipeline && uv run python extract.py "${args[@]}") | tee -a "$LOG_DIR/extract-aluno.log"
  local out
  if [[ -n "$run_id" ]]; then
    out="extracted/passaporte-aluno/$run_id"
  else
    out="$(latest_run_dir passaporte-aluno)"
  fi
  assert_extract_complete "$out" "$expected" "extract aluno"
}

run_extract_prof() {
  local expected run_id="${EXTRACT_PROF_RUN:-}"
  expected="$(kind_count passaporte-professor answer_key)"
  echo "== extract_key professor (expected $expected; run_id=${run_id:-new}) =="
  local args=(--book passaporte-professor)
  if [[ -n "$run_id" ]]; then
    args+=(--run-id "$run_id")
  fi
  (cd pipeline && uv run python extract_key.py "${args[@]}") | tee -a "$LOG_DIR/extract-professor.log"
  local out
  if [[ -n "$run_id" ]]; then
    out="extracted/passaporte-professor/$run_id"
  else
    out="$(latest_run_dir passaporte-professor)"
  fi
  assert_extract_complete "$out" "$expected" "extract_key professor"
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
