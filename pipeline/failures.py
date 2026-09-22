"""Shared failure log for pipeline stages.

Failed pages / items append here and must not invent answers.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FAILURES_PATH = ROOT / "failures.jsonl"


def append_failure(
    record: dict[str, Any],
    path: Path | None = None,
) -> None:
    target = path or FAILURES_PATH
    payload = {
        **record,
        "at": record.get("at")
        or datetime.now(timezone.utc).isoformat(),
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
