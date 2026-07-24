"""
VAJRA Learning System — a scientific Learning Operating System.

Independent from Memory (stores), Governor (decides), and Execution (acts).
Learning IMPROVES: it turns experiences into verified knowledge and reversible
recommendations, and it fabricates nothing.

Pipeline: Observe -> Reflect -> Hypothesize -> Test -> Validate -> Record
          -> Recommend -> (Founder approval) -> Deploy -> Observe again.

Dependency-free (Python stdlib only) so it is portable into the VAJRA repo
whatever its surrounding stack.
"""
from .models import (  # noqa: F401
    Observation, Hypothesis, EvidenceResult, Lesson, Recommendation,
    HypothesisState, LessonStatus, RecommendationStatus, ValidationMethod,
    LearningCategory, PROTECTED_ZONES,
)
from .observation_engine import ObservationEngine  # noqa: F401
from .reflection_engine import ReflectionEngine  # noqa: F401
from .evidence_engine import EvidenceEngine  # noqa: F401
from .lesson_ledger import LessonLedger  # noqa: F401
from .policy_engine import PolicyEvolutionEngine  # noqa: F401
from .confidence import score_confidence  # noqa: F401
from . import metrics  # noqa: F401
from .walkforward import generate_windows, Window  # noqa: F401
from .experiment import (  # noqa: F401
    Experiment, ExperimentLedger, EvidenceLedger, DecisionLedger,
)

__all__ = [
    "Observation", "Hypothesis", "EvidenceResult", "Lesson", "Recommendation",
    "HypothesisState", "LessonStatus", "RecommendationStatus", "ValidationMethod",
    "LearningCategory", "PROTECTED_ZONES",
    "ObservationEngine", "ReflectionEngine", "EvidenceEngine",
    "LessonLedger", "PolicyEvolutionEngine", "score_confidence",
    "metrics", "generate_windows", "Window",
    "Experiment", "ExperimentLedger", "EvidenceLedger", "DecisionLedger",
]
