"""Append-only JSONL store — the Learning System's own persistence.

Independent of Memory/Governor/Execution. No update, no delete: history is
never rewritten. Corrections/supersessions are new appended records.
"""
from __future__ import annotations

import json
import os
from typing import Any, Iterator


class AppendOnlyStore:
    """Minimal append-only JSONL store. Writes only ever append."""

    def __init__(self, path: str | None = None) -> None:
        self.path = path
        self._mem: list[dict[str, Any]] = []
        if path and os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self._mem.append(json.loads(line))

    def append(self, record: dict[str, Any]) -> dict[str, Any]:
        # Defensive: never allow an append to masquerade as an in-place edit.
        self._mem.append(record)
        if self.path:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(json.dumps(record, sort_keys=True) + "\n")
        return record

    def all(self) -> list[dict[str, Any]]:
        return list(self._mem)

    def find(self, **filters: Any) -> Iterator[dict[str, Any]]:
        for r in self._mem:
            if all(r.get(k) == v for k, v in filters.items()):
                yield r

    def __len__(self) -> int:
        return len(self._mem)

    # Intentionally NO update() and NO delete(): append-only by design.
