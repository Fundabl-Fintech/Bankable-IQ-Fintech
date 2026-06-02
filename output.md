"""
Phase 3 Roadmap Tracker — Scale & Defensibility Sprint
======================================================

Owner: Platform
Depends On: #1049, #1012, #1013, #992, #1045, #961
Blocks: []
Spec Sections: 16.3
Blueprint Sections: XIV
Maturity Target: Compounding Capital
Phase 3 Target: Week 52 (12 months post-MVP launch)
"""

from __future__ import annotations

import enum
import logging
import re
from dataclasses import dataclass, field, fields
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Final, List, Optional, Set, Tuple, Union
from uuid import UUID, uuid4

# ---------------------------------------------------------------------------
# Logging Configuration
# ---------------------------------------------------------------------------

_logger = logging.getLogger(__name__)
_logger.setLevel(logging.INFO)

if not _logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setLevel(logging.INFO)
    _formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    _handler.setFormatter(_formatter)
    _logger.addHandler(_handler)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ISSUE_ID_PATTERN: Final[re.Pattern] = re.compile(r"^#\d+$")
MAX_DESCRIPTION_LENGTH: Final[int] = 5000
MAX_NOTES_LENGTH: Final[int] = 10000
MAX_CRITERIA_COUNT: Final[int] = 50
MAX_MILESTONES: Final[int] = 100
MAX_RISKS: Final[int] = 100
MAX_METRICS: Final[int] = 50

# ---------------------------------------------------------------------------
# Enums & Constants
# ---------------------------------------------------------------------------

class Phase3Deliverable(enum.Enum):
    """Enumeration of all Phase 3 deliverables with their canonical labels."""
    BAI_STACK = "BAI Stack with Adaptive Wheel"
    BLIN_LEARNING = "BLIN Bayesian Learning Loop"
    COACHING_GUARDRAILS = "Advanced Coaching Guardrails"
    COMMUNITY_REPUTATION = "Community & Advisor Reputation System"
    MULTI_REGION = "Multi-Region Active-Active"
    SOC2_AUDIT = "SOC 2 Type II Audit"
    PUBLIC_MARKETPLACE = "Public Marketplace"
    BUG_BOUNTY = "Bug Bounty Program"
    EDO_LICENSING = "EDO B2B Licensing Framework"


class RiskLevel(enum.Enum):
    """Risk severity levels."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"


class DeliverableStatus(enum.Enum):
    """Status tracking for deliverables."""
    NOT_STARTED = "Not Started"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    BLOCKED = "Blocked"
    AT_RISK = "At Risk"


class BadgeTier(enum.Enum):
    """Badge tier levels for reputation system."""
    BRONZE = "Bronze"
    SILVER = "Silver"
    GOLD = "Gold"
    PLATINUM = "Platinum"


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class Phase3Error(Exception):
    """Base exception for Phase 3 roadmap errors."""
    pass


class ValidationError(Phase3Error):
    """Raised when validation fails."""
    pass


class DuplicateDeliverableError(Phase3Error):
    """Raised when attempting to add a duplicate deliverable."""
    pass


class DependencyError(Phase3Error):
    """Raised when dependency validation fails."""
    pass


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Dependency:
    """Represents a single dependency on another issue or task.

    Attributes:
        issue_id: The issue identifier (e.g., "#1049")
        description: Human-readable description of the dependency
        required: Whether this dependency is mandatory

    Raises:
        ValidationError: If validation fails
    """
    issue_id: str
    description: str
    required: bool = True

    def __post_init__(self) -> None:
        """Validate dependency fields after initialization."""
        try:
            if not ISSUE_ID_PATTERN.match(self.issue_id):
                raise ValidationError(
                    f"issue_id must match pattern '#\\d+', got {self.issue_id!r}"
                )
            if not self.description or not self.description.strip():
                raise ValidationError("description must be non-empty")
            if len(self.description) > MAX_DESCRIPTION_LENGTH:
                raise ValidationError(
                    f"description exceeds maximum length of {MAX_DESCRIPTION_LENGTH}"
                )
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Invalid dependency: {e}") from e


@dataclass(frozen=True)
class Risk:
    """Represents a single risk entry in the risk register.

    Attributes:
        description: Risk description
        impact: Impact level
        likelihood: Likelihood level
        mitigation: Mitigation strategy

    Raises:
        ValidationError: If validation fails
    """
    description: str
    impact: RiskLevel
    likelihood: RiskLevel
    mitigation: str

    def __post_init__(self) -> None:
        """Validate risk fields after initialization."""
        try:
            if not self.description or not self.description.strip():
                raise ValidationError("Risk description must be non-empty")
            if len(self.description) > MAX_DESCRIPTION_LENGTH:
                raise ValidationError(
                    f"Risk description exceeds maximum length of {MAX_DESCRIPTION_LENGTH}"
                )
            if not self.mitigation or not self.mitigation.strip():
                raise ValidationError("Risk mitigation must be non-empty")
            if len(self.mitigation) > MAX_DESCRIPTION_LENGTH:
                raise ValidationError(
                    f"Risk mitigation exceeds maximum length of {MAX_DESCRIPTION_LENGTH}"
                )
            if not isinstance(self.impact, RiskLevel):
                raise ValidationError("impact must be a RiskLevel enum")
            if not isinstance(self.likelihood, RiskLevel):
                raise ValidationError("likelihood must be a RiskLevel enum")
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Invalid risk: {e}") from e


@dataclass(frozen=True)
class Milestone:
    """A milestone with a target week and description.

    Attributes:
        week_range: Week range (e.g., "Weeks 27-30")
        description: Milestone description

    Raises:
        ValidationError: If validation fails
    """
    week_range: str
    description: str

    def __post_init__(self) -> None:
        """Validate milestone fields after initialization."""
        try:
            if not self.week_range or not self.week_range.strip():
                raise ValidationError("week_range must be non-empty")
            if len(self.week_range) > 50:
                raise ValidationError("week_range exceeds maximum length of 50")
            if not self.description or not self.description.strip():
                raise ValidationError("Milestone description must be non-empty")
            if len(self.description) > MAX_DESCRIPTION_LENGTH:
                raise ValidationError(
                    f"Milestone description exceeds maximum length of {MAX_DESCRIPTION_LENGTH}"
                )
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Invalid milestone: {e}") from e


@dataclass
class AcceptanceCriteria:
    """Structured acceptance criteria for a deliverable.

    Attributes:
        criteria: List of acceptance criteria strings
    """
    criteria: List[str] = field(default_factory=list)

    def add_criterion(self, criterion: str) -> None:
        """Add a new acceptance criterion.

        Args:
            criterion: The criterion to add

        Raises:
            ValidationError: If criterion is invalid
        """
        if not criterion or not criterion.strip():
            raise ValidationError("Criterion must be non-empty")
        if len(criterion) > MAX_DESCRIPTION_LENGTH:
            raise ValidationError(
                f"Criterion exceeds maximum length of {MAX_DESCRIPTION_LENGTH}"
            )
        if len(self.criteria) >= MAX_CRITERIA_COUNT:
            raise ValidationError(
                f"Cannot add more than {MAX_CRITERIA_COUNT} criteria"
            )
        self.criteria.append(criterion.strip())
        _logger.debug("Added criterion: %s", criterion[:50])

    def is_satisfied(self, checks: Dict[str, bool]) -> bool:
        """Return True if all criteria are met according to the checks dict.

        Args:
            checks: Dictionary mapping criteria to their satisfaction status

        Returns:
            True if all criteria are satisfied

        Raises:
            ValidationError: If checks dict is invalid
        """
        if not isinstance(checks, dict):
            raise ValidationError("checks must be a dictionary")
        if len(checks) != len(self.criteria):
            _logger.warning(
                "Mismatch between criteria count (%d) and checks count (%d)",
                len(self.criteria), len(checks)
            )
        try:
            return all(checks.get(c, False) for c in self.criteria)
        except Exception as e:
            raise ValidationError(f"Error checking criteria satisfaction: {e}") from e


@dataclass
class Deliverable:
    """Represents a single Phase 3 deliverable with full metadata.

    Attributes:
        name: Human-readable name
        deliverable_type: Type from Phase3Deliverable enum
        depends_on: List of dependencies
        acceptance: Acceptance criteria
        status: Current status
        owner: Owner of the deliverable
        target_week: Target week number
        notes: Additional notes

    Raises:
        ValidationError: If validation fails
    """
    name: str
    deliverable_type: Phase3Deliverable
    depends_on: List[Dependency] = field(default_factory=list)
    acceptance: AcceptanceCriteria = field(default_factory=AcceptanceCriteria)
    status: DeliverableStatus = DeliverableStatus.NOT_STARTED
    owner: str = "Platform"
    target_week: Optional[int] = None
    notes: str = ""

    def __post_init__(self) -> None:
        """Validate deliverable fields after initialization."""
        try:
            if not self.name or not self.name.strip():
                raise ValidationError("Deliverable name must be non-empty")
            if len(self.name) > 200:
                raise ValidationError("Deliverable name exceeds maximum length of 200")
            if not isinstance(self.deliverable_type, Phase3Deliverable):
                raise ValidationError("deliverable_type must be a Phase3Deliverable enum")
            if not isinstance(self.status, DeliverableStatus):
                raise ValidationError("status must be a DeliverableStatus enum")
            if not self.owner or not self.owner.strip():
                raise ValidationError("owner must be non-empty")
            if len(self.owner) > 100:
                raise ValidationError("owner exceeds maximum length of 100")
            if self.target_week is not None and (self.target_week < 1 or self.target_week > 52):
                raise ValidationError("target_week must be between 1 and 52")
            if len(self.notes) > MAX_NOTES_LENGTH:
                raise ValidationError(
                    f"notes exceeds maximum length of {MAX_NOTES_LENGTH}"
                )
            if not isinstance(self.depends_on, list):
                raise ValidationError("depends_on must be a list")
            if not isinstance(self.acceptance, AcceptanceCriteria):
                raise ValidationError("acceptance must be an AcceptanceCriteria instance")
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Invalid deliverable: {e}") from e

    def validate_dependencies(self, all_ids: Set[str]) -> List[str]:
        """Return list of missing dependency IDs.

        Args:
            all_ids: Set of all known issue IDs

        Returns:
            List of missing dependency IDs

        Raises:
            ValidationError: If all_ids is invalid
        """
        if not isinstance(all_ids, set):
            raise ValidationError("all_ids must be a set")
        missing: List[str] = []
        for dep in self.depends_on:
            if dep.issue_id not in all_ids:
                missing.append(dep.issue_id)
                _logger.warning(
                    "Missing dependency %s for deliverable %s",
                    dep.issue_id, self.name
                )
        return missing


@dataclass
class Phase3Roadmap:
    """Top-level container for the entire Phase 3 roadmap.

    Attributes:
        roadmap_id: Unique identifier
        created_at: Creation timestamp
        updated_at: Last update timestamp
        deliverables: Map of deliverable types to deliverables
        milestones: List of milestones
        risks: List of risks
        success_metrics: Dictionary of success metrics
        linked_issue_prefixes: Map of issue prefixes for tracking
    """
    roadmap_id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    deliverables: Dict[Phase3Deliverable, Deliverable] = field(default_factory=dict)
    milestones: List[Milestone] = field(default_factory=list)
    risks: List[Risk] = field(default_factory=list)
    success_metrics: Dict[str, Union[str, int, float]] = field(default_factory=dict)
    linked_issue_prefixes: Dict[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate roadmap fields after initialization."""
        try:
            if not isinstance(self.roadmap_id, UUID):
                raise ValidationError("roadmap_id must be a UUID")
            if not isinstance(self.created_at, datetime):
                raise ValidationError("created_at must be a datetime")
            if not isinstance(self.updated_at, datetime):
                raise ValidationError("updated_at must be a datetime")
            if not isinstance(self.deliverables, dict):
                raise ValidationError("deliverables must be a dict")
            if not isinstance(self.milestones, list):
                raise ValidationError("milestones must be a list")
            if not isinstance(self.risks, list):
                raise ValidationError("risks must be a list")
            if not isinstance(self.success_metrics, dict):
                raise ValidationError("success_metrics must be a dict")
            if not isinstance(self.linked_issue_prefixes, dict):
                raise ValidationError("linked_issue_prefixes must be a dict")
        except ValidationError:
            raise
        except Exception as e:
            raise ValidationError(f"Invalid roadmap: {e}") from e

    def _update_timestamp(self) -> None:
        """Update the updated_at timestamp."""
        self.updated_at = datetime.now(timezone.utc)

    def add_deliverable(self, deliverable: Deliverable) -> None:
        """Add a deliverable to the roadmap.

        Args:
            deliverable: The deliverable to add

        Raises:
            DuplicateDeliverableError: If deliverable type already exists
            ValidationError: If deliverable is invalid
        """
        if not isinstance(deliverable, Deliverable):
            raise ValidationError("deliverable must be a Deliverable instance")
        if deliverable.deliverable_type in self.deliverables:
            raise DuplicateDeliverableError(
                f"Deliverable {deliverable.deliverable_type.value} already exists"
            )
        self.deliverables[deliverable.deliverable_type] = deliverable
        self._update_timestamp()
        _logger.info("Added deliverable: %s (type: %s)", deliverable.name, deliverable.deliverable_type.value)

    def add_milestone(self, milestone: Milestone) -> None:
        """Add a milestone to the roadmap.

        Args:
            milestone: The milestone to add

        Raises:
            ValidationError: If milestone is invalid or limit exceeded
        """
        if not isinstance(milestone, Milestone):
            raise ValidationError("milestone must be a Milestone instance")
        if len(self.milestones) >= MAX_MILESTONES:
            raise ValidationError(f"Cannot add more than {MAX_MILESTONES} milestones")
        self.milestones.append(milestone)
        self._update_timestamp()
        _logger.info("Added milestone: %s (%s)", milestone.description[:50], milestone.week_range)

    def add_risk(self, risk: Risk) -> None:
        """Add a risk to the risk register.

        Args:
            risk: The risk to add

        Raises:
            ValidationError: If risk is invalid or limit exceeded
        """
        if not isinstance(risk, Risk):
            raise ValidationError("risk must be a Risk instance")
        if len(self.risks) >= MAX_RISKS:
            raise ValidationError(f"Cannot add more than {MAX_RISKS} risks")
        self.risks.append(risk)
        self._update_timestamp()
        _logger.info("Added risk: %s (impact: %s, likelihood: %s)", 
                     risk.description[:50], risk.impact.value, risk.likelihood.value)

    def set_success_metric(self, key: str, value: Union[str, int, float]) -> None:
        """Set a success metric.

        Args:
            key: Metric key
            value: Metric value

        Raises:
            ValidationError: If key is invalid or limit exceeded
        """
        if not key or not key.strip():
            raise ValidationError("Metric key must be non-empty")
        if len(key) > 100:
            raise ValidationError("Metric key exceeds maximum length of 100")
        if len(self.success_metrics) >= MAX_METRICS:
            raise ValidationError(f"Cannot add more than {MAX_METRICS} metrics")
        if not isinstance(value, (str, int, float)):
            raise ValidationError("Metric value must be str, int, or float")
        self.success_metrics[key.strip()] = value
        self._update_timestamp()
        _logger.info("Set success metric: %s = %s", key, value)

    def validate_all_dependencies(self) -> Dict[str, List[str]]:
        """Validate all deliverables' dependencies and return missing ones.

        Returns:
            Dictionary mapping deliverable names to lists of missing dependency IDs

        Raises:
            DependencyError: If validation fails
        """
        try:
            all_ids: Set[str] = set()
            for deliv in self.deliverables.values():
                for dep in