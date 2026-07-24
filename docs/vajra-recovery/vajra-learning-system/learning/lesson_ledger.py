"""Lesson Ledger — append-only store of validated lessons.

Lessons never overwrite history. A correction is a NEW lesson that supersedes
the old id; the old record remains on disk. Contradicting evidence and failed
experiments are preserved, never hidden.
"""
from __future__ import annotations

from typing import Any

from .models import Lesson, LessonStatus
from .store import AppendOnlyStore


class LessonLedger:
    def __init__(self, store: AppendOnlyStore | None = None) -> None:
        self.store = store or AppendOnlyStore()

    def record(self, lesson: Lesson) -> Lesson:
        self.store.append(lesson.to_dict())
        return lesson

    def supersede(self, old_id: str, new_lesson: Lesson) -> Lesson:
        """Append a superseding lesson AND an append-only supersession marker.
        The original lesson row is left intact (history is never rewritten)."""
        new_lesson.supersedes = old_id
        new_lesson.version = self._next_version(old_id)
        self.store.append(new_lesson.to_dict())
        # Append-only status marker (does not mutate the original record):
        self.store.append({
            "id": f"mark_{new_lesson.id}", "type": "supersession",
            "superseded_id": old_id, "by_id": new_lesson.id,
            "status": LessonStatus.SUPERSEDED.value, "date": new_lesson.date,
        })
        return new_lesson

    def _next_version(self, old_id: str) -> int:
        versions = [r.get("version", 1) for r in self.store.find(id=old_id)]
        return (max(versions) if versions else 1) + 1

    def superseded_ids(self) -> set[str]:
        return {r["superseded_id"] for r in self.store.find(type="supersession")}

    def active(self) -> list[dict[str, Any]]:
        """Validated lessons that have not been superseded."""
        gone = self.superseded_ids()
        return [r for r in self.store.all()
                if r.get("status") == LessonStatus.VALIDATED.value and r.get("id") not in gone]

    def search(self, **filters: Any) -> list[dict[str, Any]]:
        return list(self.store.find(**filters))

    def __len__(self) -> int:
        return len(self.store)
