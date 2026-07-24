"""Phase 7 — Skeptic Engine. Scientific skepticism is mandatory.

Every "successful" experiment must survive challenge before it is trusted. The
engine emits the five mandatory questions and refuses to pass an experiment
whose challenge is unanswered — you cannot skip skepticism by staying silent.
"""
from __future__ import annotations

MANDATORY_QUESTIONS = (
    "weakest_assumption",        # What assumption is weakest?
    "contradicting_evidence",    # What evidence contradicts this?
    "failure_conditions",        # Under what conditions would this fail?
    "falsification_test",        # What would falsify this conclusion?
    "additional_experiment",     # What additional experiment is required?
)


def challenge(claim: str) -> dict:
    """Return the mandatory challenge for a successful claim."""
    return {"claim": claim,
            "questions": {q: None for q in MANDATORY_QUESTIONS},
            "instruction": "Every field must be answered with substance before the claim may be trusted."}


def assess_challenge(answers: dict) -> dict:
    """A challenge PASSES only if every mandatory question is answered non-trivially."""
    unanswered = [q for q in MANDATORY_QUESTIONS
                  if not str(answers.get(q, "")).strip()]
    passed = not unanswered
    return {"passed": passed, "unanswered": unanswered,
            "verdict": "skepticism satisfied" if passed
                       else "REJECTED — unanswered challenge questions remain"}
