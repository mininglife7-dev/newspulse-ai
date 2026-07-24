"""Data model for the VAJRA Learning System.

Every record is explainable and traceable by construction: required fields
force provenance, evidence, and limitations to travel with each object.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class HypothesisState(str, Enum):
    PROPOSED = "proposed"
    UNDER_TEST = "under_test"
    SUPPORTED = "supported"
    REFUTED = "refuted"
    INCONCLUSIVE = "inconclusive"


class LessonStatus(str, Enum):
    VALIDATED = "validated"
    SUPERSEDED = "superseded"
    RETIRED = "retired"


class RecommendationStatus(str, Enum):
    PROPOSED = "proposed"
    APPROVED = "approved"
    REJECTED = "rejected"
    DEPLOYED = "deployed"
    ROLLED_BACK = "rolled_back"


class ValidationMethod(str, Enum):
    HISTORICAL_REPLAY = "historical_replay"
    WALK_FORWARD = "walk_forward"
    MONTE_CARLO = "monte_carlo"
    CROSS_VALIDATION = "cross_validation"
    SIGNIFICANCE_TEST = "significance_test"
    REGIME_COMPARISON = "regime_comparison"
    STRESS_TEST = "stress_test"
    OUT_OF_SAMPLE = "out_of_sample"


class LearningCategory(str, Enum):
    STRATEGY = "strategy"
    RISK = "risk"
    EXECUTION = "execution"
    MARKET_REGIME = "market_regime"
    FEATURE_IMPORTANCE = "feature_importance"
    INDICATOR_USEFULNESS = "indicator_usefulness"
    POSITION_SIZING = "position_sizing"
    PORTFOLIO_ALLOCATION = "portfolio_allocation"
    PATTERN_DISCOVERY = "pattern_discovery"
    FAILURE_ANALYSIS = "failure_analysis"
    ANOMALY_DETECTION = "anomaly_detection"
    PERFORMANCE_ATTRIBUTION = "performance_attribution"
    OPERATIONAL_RELIABILITY = "operational_reliability"


# Founder Protected Zone — the Learning System may recommend, but NEVER
# autonomously modify anything that maps to one of these zones.
PROTECTED_ZONES: frozenset[str] = frozenset({
    "capital_allocation",
    "maximum_drawdown",
    "daily_loss_limit",
    "broker_permissions",
    "api_credentials",
    "production_deployment",
    "live_trading_authorization",
    "emergency_stop_logic",
})


@dataclass
class Observation:
    """A captured fact. NO conclusions — only what was observed."""
    kind: str                       # e.g. 'paper_trade', 'market_event', 'backtest'
    payload: dict[str, Any]         # arbitrary observed fields (features, pnl, slippage...)
    provenance: str                 # where it came from
    confidence: str = "measured"    # measured | derived | modeled | unknown
    id: str = field(default_factory=lambda: _uid("obs"))
    ts: str = field(default_factory=_now)

    def __post_init__(self) -> None:
        if "conclusion" in self.payload:
            raise ValueError("Observation.payload must not contain conclusions (observe, don't infer).")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Hypothesis:
    """A candidate explanation. Never a fact until Evidence supports it."""
    question: str
    statement: str
    proposed_by: str
    supporting_observation_ids: list[str] = field(default_factory=list)
    category: str = LearningCategory.STRATEGY.value
    state: str = HypothesisState.PROPOSED.value
    id: str = field(default_factory=lambda: _uid("hyp"))
    ts: str = field(default_factory=_now)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class EvidenceResult:
    """The outcome of testing one hypothesis. Records pass AND fail alike."""
    hypothesis_id: str
    method: str
    sample_size: int
    statistic: float
    p_value: float
    effect_size: float
    in_sample_passed: bool
    out_of_sample_passed: bool
    passed: bool
    reason: str
    limitations: str
    regimes_covered: list[str] = field(default_factory=list)
    id: str = field(default_factory=lambda: _uid("evd"))
    ts: str = field(default_factory=_now)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Lesson:
    """A validated finding. Append-only; superseded, never overwritten."""
    strategy: str
    market: str
    market_regime: str
    confidence_score: float
    evidence_summary: str
    supporting_statistics: dict[str, Any]
    contradicting_evidence: str          # preserved, never hidden
    source_experiment_ids: list[str]
    category: str = LearningCategory.STRATEGY.value
    version: int = 1
    status: str = LessonStatus.VALIDATED.value
    supersedes: str | None = None
    id: str = field(default_factory=lambda: _uid("les"))
    date: str = field(default_factory=_now)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Recommendation:
    """A reversible, evidence-backed improvement proposal. Never auto-applies
    to the Founder Protected Zone."""
    description: str
    target: str                          # what it would change
    expected_benefit: str
    potential_risks: str
    rollback_plan: str
    confidence: float
    lesson_ids: list[str]
    touches_protected_zone: bool = False
    protected_zones: list[str] = field(default_factory=list)
    requires_founder_approval: bool = False
    status: str = RecommendationStatus.PROPOSED.value
    id: str = field(default_factory=lambda: _uid("rec"))
    ts: str = field(default_factory=_now)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
