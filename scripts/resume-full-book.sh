#!/usr/bin/env bash
# Resume full-book classify+extract; restarts classify until page coverage is complete.
set -uo pipefail

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
page_count() {
  local book="$1"
  python3 -c "import json,sys; print(len(json.load(open(f'extracted/{sys.argv[1]}/pages.json'))['pages']))" "$book" 2>/dev/null || echo 0
}

raster_count() {
  local book="$1"
  ls -1 "raw/$book"/p-*.png 2>/dev/null | wc -l | tr -d ' '
}

# Pages present in pages.json that match a raster (handles gaps, not just len).
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
print(len(missing), file=sys.stderr)
" "$book" 2>/dev/null || echo ""
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
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $book stalled at $have/$need after $stall unchanged passes — abort classify loop" | tee -a "$LOG"
      return 1
    fi
    attempt=$((attempt + 1))
    (cd pipeline && uv run python classify.py --book "$book") 2>&1 | tee -a "extracted/logs/classify-$book.log" | tee -a "$LOG"
    local rc=${PIPESTATUS[0]}
    if [[ $rc -ne 0 ]]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $book classify exited $rc — retry in 20s" | tee -a "$LOG"
      sleep 20
    else
      # completed a pass but may still be short if killed mid-write; loop checks count
      sleep 2
    fi
  done
}

{
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] resume-full-book start"
  classify_until_done passaporte-aluno || exit 1
  classify_until_done passaporte-professor || exit 1

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] == extract aluno =="
  (cd pipeline && uv run python extract.py --book passaporte-aluno) 2>&1 | tee -a extracted/logs/extract-aluno.log

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] == extract_key professor =="
  (cd pipeline && uv run python extract_key.py --book passaporte-professor) 2>&1 | tee -a extracted/logs/extract-professor.log

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ALL DONE — next: join with run ids, then pnpm pipeline:hints && pnpm pipeline:crop"
} >> "$LOG" 2>&1
