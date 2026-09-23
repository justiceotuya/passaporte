#!/usr/bin/env bash
# Resume full-book classify+extract; restarts classify until page coverage is complete.
# Never prints ALL DONE unless extract JSON counts meet pages.json expectations.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p extracted/logs

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

export PYTHONUNBUFFERED=1
LOG="$ROOT/extracted/logs/full-book-resume.out"

# Optional: EXTRACT_ALUNO_RUN=20260923T002149Z-d2ef0ba5 to resume a specific run.
EXTRACT_ALUNO_RUN="${EXTRACT_ALUNO_RUN:-}"
EXTRACT_PROF_RUN="${EXTRACT_PROF_RUN:-}"

raster_count() {
  local book="$1"
  ls -1 "raw/$book"/p-*.png 2>/dev/null | wc -l | tr -d ' '
}

coverage_count() {
  local book="$1"
  python3 -c "
import json, pathlib, re, sys
book = sys.argv[1]
rasters = {
    int(m.group(1))
    for p in pathlib.Path('raw', book).glob('p-*.png')
    if (m := re.match(r'p-(\d+)\.png', p.name))
}
path = pathlib.Path('extracted', book, 'pages.json')
if not path.is_file():
    print(0); raise SystemExit
pages = {int(row['page']) for row in json.loads(path.read_text())['pages']}
print(len(pages & rasters))
" "$book" 2>/dev/null || echo 0
}

missing_pages() {
  local book="$1"
  python3 -c "
import json, pathlib, re, sys
book = sys.argv[1]
rasters = sorted({
    int(m.group(1))
    for p in pathlib.Path('raw', book).glob('p-*.png')
    if (m := re.match(r'p-(\d+)\.png', p.name))
})
path = pathlib.Path('extracted', book, 'pages.json')
pages = set()
if path.is_file():
    pages = {int(row['page']) for row in json.loads(path.read_text())['pages']}
missing = [n for n in rasters if n not in pages]
print(','.join(map(str, missing[:20])) + ('…' if len(missing) > 20 else ''))
" "$book" 2>/dev/null || echo ""
}

kind_count() {
  local book="$1"
  local kind="$2"
  python3 -c "
import json, sys
book, kind = sys.argv[1], sys.argv[2]
path = f'extracted/{book}/pages.json'
pages = json.load(open(path))['pages']
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
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] error: $label missing run dir" | tee -a "$LOG" >&2
    return 1
  fi
  have="$(json_page_count "$run_dir")"
  if [[ "$have" -lt "$expected" ]]; then
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] error: $label incomplete $have/$expected in $run_dir — NOT done" | tee -a "$LOG" >&2
    return 1
  fi
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $label complete $have/$expected → $run_dir" | tee -a "$LOG"
  return 0
}

classify_until_done() {
  local book="$1"
  local need
  need="$(raster_count "$book")"
  local attempt=0
  local prev_have=-1
  local stall=0
  while true; do
    local have
    have="$(coverage_count "$book")"
    local missing
    missing="$(missing_pages "$book")"
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $book classified $have / $need (attempt $attempt) missing=${missing:-none}" | tee -a "$LOG"
    if [[ "$have" -ge "$need" ]]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $book classify complete" | tee -a "$LOG"
      return 0
    fi
    if [[ "$have" -eq "$prev_have" ]]; then
      stall=$((stall + 1))
    else
      stall=0
      prev_have="$have"
    fi
    if [[ "$stall" -ge 5 ]]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $book stalled at $have/$need after $stall unchanged passes — abort classify loop" | tee -a "$LOG" >&2
      return 1
    fi
    attempt=$((attempt + 1))
    # Classify may exit non-zero; retry until coverage is complete (do not trip set -e).
    set +e
    (cd pipeline && uv run python classify.py --book "$book") 2>&1 | tee -a "extracted/logs/classify-$book.log" | tee -a "$LOG"
    local rc=${PIPESTATUS[0]}
    set -e
    if [[ $rc -ne 0 ]]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $book classify exited $rc — retry in 20s" | tee -a "$LOG"
      sleep 20
    else
      sleep 2
    fi
  done
}

run_extract_aluno() {
  local expected
  expected="$(kind_count passaporte-aluno exercises)"
  local run_id="$EXTRACT_ALUNO_RUN"
  if [[ -z "$run_id" ]]; then
    local latest
    latest="$(latest_run_dir passaporte-aluno)"
    if [[ -n "$latest" ]]; then
      local have
      have="$(json_page_count "$latest")"
      # Resume an incomplete run; otherwise start a new one.
      if [[ "$have" -gt 0 && "$have" -lt "$expected" ]]; then
        run_id="$(basename "$latest")"
      fi
    fi
  fi

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] == extract aluno (expected $expected exercises; run_id=${run_id:-new}) ==" | tee -a "$LOG"
  local args=(--book passaporte-aluno)
  if [[ -n "$run_id" ]]; then
    args+=(--run-id "$run_id")
  fi
  (cd pipeline && uv run python extract.py "${args[@]}") 2>&1 | tee -a extracted/logs/extract-aluno.log

  local out
  if [[ -n "$run_id" ]]; then
    out="extracted/passaporte-aluno/$run_id"
  else
    out="$(latest_run_dir passaporte-aluno)"
  fi
  assert_extract_complete "$out" "$expected" "extract aluno"
}

run_extract_professor() {
  local expected
  expected="$(kind_count passaporte-professor answer_key)"
  local run_id="$EXTRACT_PROF_RUN"

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] == extract_key professor (expected $expected answer_key; run_id=${run_id:-new}) ==" | tee -a "$LOG"
  local args=(--book passaporte-professor)
  if [[ -n "$run_id" ]]; then
    args+=(--run-id "$run_id")
  fi
  (cd pipeline && uv run python extract_key.py "${args[@]}") 2>&1 | tee -a extracted/logs/extract-professor.log

  local out
  if [[ -n "$run_id" ]]; then
    out="extracted/passaporte-professor/$run_id"
  else
    out="$(latest_run_dir passaporte-professor)"
  fi
  # Prefer a non-empty latest run if the brand-new empty dir edge-case appears.
  if [[ -z "$run_id" ]]; then
    local candidate have
    for candidate in $(ls -1dt extracted/passaporte-professor/20* 2>/dev/null || true); do
      have="$(json_page_count "$candidate")"
      if [[ "$have" -gt 0 ]]; then
        out="$candidate"
        break
      fi
    done
  fi
  assert_extract_complete "$out" "$expected" "extract_key professor"
}

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] resume-full-book start"
  classify_until_done passaporte-aluno
  classify_until_done passaporte-professor
  run_extract_aluno
  run_extract_professor
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ALL DONE — next: join with run ids, then pnpm pipeline:hints && pnpm pipeline:crop"
} >> "$LOG" 2>&1
