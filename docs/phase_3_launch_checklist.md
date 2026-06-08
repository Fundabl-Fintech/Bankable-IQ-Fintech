"""
Phase 3 Launch Checklist — Bug Bounty Program Readiness

Owner: service:compliance
Depends on: §10.4 Application Security Practices, §11.2 CI/CD Pipeline, §16.3 Phase 3 Planning
Blocks: §16.3 Phase 3 Public Marketplace Launch
Spec Sections: §10.4
Blueprint Sections: §XIV Compounding Moat
Maturity Target: compounding_capital
"""

from __future__ import annotations

import enum
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Set, Tuple, Union, Any, Callable
from functools import wraps
import time
import json
from pathlib import Path

# Configure module logger
logger = logging.getLogger(__name__)


class SeverityLevel(enum.Enum):
    """Defines severity tiers for bug bounty findings."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class ProgramStatus(enum.Enum):
    """Tracks the current status of the bug bounty program."""
    NOT_STARTED = "not_started"
    PRE_LAUNCH = "pre_launch"
    SOFT_LAUNCH = "soft_launch"
    PUBLIC_LAUNCH = "public_launch"
    OPERATIONAL = "operational"


class ChecklistStatus(enum.Enum):
    """Status of individual checklist items."""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    NOT_APPLICABLE = "not_applicable"


@dataclass(frozen=True)
class PayoutRange:
    """Immutable payout range for a severity tier."""
    min_amount: Decimal
    max_amount: Decimal
    
    def __post_init__(self) -> None:
        """Validate payout range constraints."""
        if not isinstance(self.min_amount, Decimal):
            raise TypeError(f"min_amount must be Decimal, got {type(self.min_amount)}")
        if not isinstance(self.max_amount, Decimal):
            raise TypeError(f"max_amount must be Decimal, got {type(self.max_amount)}")
        if self.min_amount < Decimal('0'):
            raise ValueError(f"Minimum payout cannot be negative: {self.min_amount}")
        if self.max_amount < self.min_amount:
            raise ValueError(
                f"Maximum payout ({self.max_amount}) must be >= minimum ({self.min_amount})"
            )
    
    def contains(self, amount: Decimal) -> bool:
        """Check if amount falls within the payout range."""
        if not isinstance(amount, Decimal):
            raise TypeError(f"amount must be Decimal, got {type(amount)}")
        return self.min_amount <= amount <= self.max_amount
    
    def to_dict(self) -> Dict[str, str]:
        """Serialize to dictionary."""
        return {
            "min_amount": str(self.min_amount),
            "max_amount": str(self.max_amount)
        }


@dataclass
class SeverityConfig:
    """Configuration for a severity tier."""
    level: SeverityLevel
    payout_range: PayoutRange
    triage_hours: int
    fix_days: int
    payout_days: int
    
    def __post_init__(self) -> None:
        """Validate severity configuration."""
        if not isinstance(self.level, SeverityLevel):
            raise TypeError(f"level must be SeverityLevel, got {type(self.level)}")
        if not isinstance(self.payout_range, PayoutRange):
            raise TypeError(f"payout_range must be PayoutRange, got {type(self.payout_range)}")
        if not isinstance(self.triage_hours, int):
            raise TypeError(f"triage_hours must be int, got {type(self.triage_hours)}")
        if not isinstance(self.fix_days, int):
            raise TypeError(f"fix_days must be int, got {type(self.fix_days)}")
        if not isinstance(self.payout_days, int):
            raise TypeError(f"payout_days must be int, got {type(self.payout_days)}")
        if self.triage_hours < 0:
            raise ValueError(f"Triage hours must be non-negative: {self.triage_hours}")
        if self.fix_days < 0:
            raise ValueError(f"Fix days must be non-negative: {self.fix_days}")
        if self.payout_days < 0:
            raise ValueError(f"Payout days must be non-negative: {self.payout_days}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "level": self.level.value,
            "payout_range": self.payout_range.to_dict(),
            "triage_hours": self.triage_hours,
            "fix_days": self.fix_days,
            "payout_days": self.payout_days
        }


@dataclass
class SLAConfig:
    """Service Level Agreement configuration."""
    acknowledgement_hours: int = 24
    classification_hours: int = 72
    critical_triage_hours: int = 4
    fix_confirmation_days: int = 14
    payout_days: int = 30
    
    def __post_init__(self) -> None:
        """Validate SLA configuration."""
        if not isinstance(self.acknowledgement_hours, int):
            raise TypeError(f"acknowledgement_hours must be int, got {type(self.acknowledgement_hours)}")
        if not isinstance(self.classification_hours, int):
            raise TypeError(f"classification_hours must be int, got {type(self.classification_hours)}")
        if not isinstance(self.critical_triage_hours, int):
            raise TypeError(f"critical_triage_hours must be int, got {type(self.critical_triage_hours)}")
        if not isinstance(self.fix_confirmation_days, int):
            raise TypeError(f"fix_confirmation_days must be int, got {type(self.fix_confirmation_days)}")
        if not isinstance(self.payout_days, int):
            raise TypeError(f"payout_days must be int, got {type(self.payout_days)}")
        if self.acknowledgement_hours <= 0:
            raise ValueError(f"Acknowledgement hours must be positive: {self.acknowledgement_hours}")
        if self.classification_hours <= 0:
            raise ValueError(f"Classification hours must be positive: {self.classification_hours}")
        if self.critical_triage_hours <= 0:
            raise ValueError(f"Critical triage hours must be positive: {self.critical_triage_hours}")
        if self.fix_confirmation_days <= 0:
            raise ValueError(f"Fix confirmation days must be positive: {self.fix_confirmation_days}")
        if self.payout_days <= 0:
            raise ValueError(f"Payout days must be positive: {self.payout_days}")
    
    def to_dict(self) -> Dict[str, int]:
        """Serialize to dictionary."""
        return {
            "acknowledgement_hours": self.acknowledgement_hours,
            "classification_hours": self.classification_hours,
            "critical_triage_hours": self.critical_triage_hours,
            "fix_confirmation_days": self.fix_confirmation_days,
            "payout_days": self.payout_days
        }


@dataclass
class ChecklistItem:
    """Represents a single checklist item with tracking."""
    id: str
    description: str
    status: ChecklistStatus = ChecklistStatus.NOT_STARTED
    assigned_to: Optional[str] = None
    completed_at: Optional[datetime] = None
    notes: List[str] = field(default_factory=list)
    
    def __post_init__(self) -> None:
        """Validate checklist item initialization."""
        if not self.id or not isinstance(self.id, str):
            raise ValueError(f"id must be a non-empty string, got {self.id}")
        if not self.description or not isinstance(self.description, str):
            raise ValueError(f"description must be a non-empty string, got {self.description}")
        if not isinstance(self.status, ChecklistStatus):
            raise TypeError(f"status must be ChecklistStatus, got {type(self.status)}")
        if self.assigned_to is not None and not isinstance(self.assigned_to, str):
            raise TypeError(f"assigned_to must be str or None, got {type(self.assigned_to)}")
        if self.completed_at is not None and not isinstance(self.completed_at, datetime):
            raise TypeError(f"completed_at must be datetime or None, got {type(self.completed_at)}")
        if not isinstance(self.notes, list):
            raise TypeError(f"notes must be list, got {type(self.notes)}")
    
    def complete(self, completed_by: str) -> None:
        """
        Mark item as completed with timestamp.
        
        Args:
            completed_by: Name or identifier of the person completing the item
        
        Raises:
            ValueError: If completed_by is empty
            TypeError: If completed_by is not a string
            RuntimeError: If item is already completed
        """
        if not isinstance(completed_by, str):
            raise TypeError(f"completed_by must be str, got {type(completed_by)}")
        if not completed_by.strip():
            raise ValueError("completed_by cannot be empty")
        if self.status == ChecklistStatus.COMPLETED:
            raise RuntimeError(f"Checklist item {self.id} is already completed")
        
        self.status = ChecklistStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.assigned_to = completed_by.strip()
        logger.info(f"Checklist item {self.id} completed by {completed_by}")
    
    def add_note(self, note: str) -> None:
        """
        Add a note to the checklist item.
        
        Args:
            note: Note content to add
        
        Raises:
            ValueError: If note is empty
            TypeError: If note is not a string
        """
        if not isinstance(note, str):
            raise TypeError(f"note must be str, got {type(note)}")
        if not note.strip():
            raise ValueError("note cannot be empty")
        
        timestamp = datetime.utcnow().isoformat()
        self.notes.append(f"[{timestamp}] {note.strip()}")
        logger.debug(f"Note added to item {self.id}: {note.strip()}")
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "description": self.description,
            "status": self.status.value,
            "assigned_to": self.assigned_to,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes.copy()
        }


def log_execution_time(func: Callable) -> Callable:
    """Decorator to log function execution time."""
    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            logger.debug(f"{func.__name__} executed in {execution_time:.3f}s")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"{func.__name__} failed after {execution_time:.3f}s: {e}")
            raise
    return wrapper


def validate_input(func: Callable) -> Callable:
    """Decorator to validate function inputs."""
    @wraps(func)
    def wrapper(self: Any, *args: Any, **kwargs: Any) -> Any:
        logger.debug(f"Validating inputs for {func.__name__}")
        return func(self, *args, **kwargs)
    return wrapper


class BugBountyProgram:
    """
    Manages the bug bounty program lifecycle and readiness checklist.
    
    This class implements the Phase 3 gating requirements for the bug bounty
    program, ensuring all pre-launch, soft-launch, and public launch criteria
    are met before the marketplace can go live.
    
    Attributes:
        platform: Bug bounty platform name
        status: Current program status
        sla_config: SLA configuration
        severity_configs: Severity tier configurations
        checklist: Dictionary of checklist items
    """
    
    VALID_PLATFORMS: Set[str] = {"hackerone", "bugcrowd"}
    
    def __init__(
        self,
        platform: str,
        sla_config: Optional[SLAConfig] = None,
        severity_configs: Optional[Dict[SeverityLevel, SeverityConfig]] = None
    ) -> None:
        """
        Initialize the bug bounty program.
        
        Args:
            platform: Bug bounty platform (HackerOne or Bugcrowd)
            sla_config: SLA configuration (uses defaults if not provided)
            severity_configs: Severity tier configurations
        
        Raises:
            ValueError: If platform is invalid or configurations are malformed
            TypeError: If any argument has incorrect type
        """
        self._validate_platform(platform)
        self.platform = platform.lower()
        self.status = ProgramStatus.NOT_STARTED
        self.sla_config = sla_config if sla_config is not None else SLAConfig()
        self.severity_configs = severity_configs if severity_configs is not None else self._default_severity_configs()
        self.checklist: Dict[str, ChecklistItem] = {}
        self._initialize_checklist()
        logger.info(f"Bug bounty program initialized on {self.platform}")
    
    @staticmethod
    def _validate_platform(platform: str) -> None:
        """
        Validate the bug bounty platform selection.
        
        Args:
            platform: Platform name to validate
        
        Raises:
            TypeError: If platform is not a string
            ValueError: If platform is not in valid platforms
        """
        if not isinstance(platform, str):
            raise TypeError(f"platform must be str, got {type(platform)}")
        if not platform.strip():
            raise ValueError("platform cannot be empty")
        if platform.lower() not in BugBountyProgram.VALID_PLATFORMS:
            raise ValueError(
                f"Invalid platform: {platform}. Must be one of: "
                f"{', '.join(sorted(BugBountyProgram.VALID_PLATFORMS))}"
            )
    
    def _default_severity_configs(self) -> Dict[SeverityLevel, SeverityConfig]:
        """Create default severity configurations."""
        return {
            SeverityLevel.CRITICAL: SeverityConfig(
                level=SeverityLevel.CRITICAL,
                payout_range=PayoutRange(Decimal('5000'), Decimal('15000')),
                triage_hours=4,
                fix_days=14,
                payout_days=30
            ),
            SeverityLevel.HIGH: SeverityConfig(
                level=SeverityLevel.HIGH,
                payout_range=PayoutRange(Decimal('2000'), Decimal('5000')),
                triage_hours=8,
                fix_days=30,
                payout_days=45
            ),
            SeverityLevel.MEDIUM: SeverityConfig(
                level=SeverityLevel.MEDIUM,
                payout_range=PayoutRange(Decimal('500'), Decimal('2000')),
                triage_hours=24,
                fix_days=60,
                payout_days=60
            ),
            SeverityLevel.LOW: SeverityConfig(
                level=SeverityLevel.LOW,
                payout_range=PayoutRange(Decimal('100'), Decimal('500')),
                triage_hours=48,
                fix_days=90,
                payout_days=90
            ),
            SeverityLevel.INFORMATIONAL: SeverityConfig(
                level=SeverityLevel.INFORMATIONAL,
                payout_range=PayoutRange(Decimal('0'), Decimal('0')),
                triage_hours=72,
                fix_days=120,
                payout_days=0
            )
        }
    
    def _initialize_checklist(self) -> None:
        """Initialize the complete checklist with all required items."""
        checklist_items = [
            ChecklistItem(
                id="BB-001",
                description="Register bug bounty program on HackerOne or Bugcrowd"
            ),
            ChecklistItem(
                id="BB-002",
                description="Publish responsible disclosure policy at security.getbankable.io"
            ),
            ChecklistItem(
                id="BB-003",
                description="Define scope: in-scope services, out-of-scope systems"
            ),
            ChecklistItem(
                id="BB-004",
                description="Define severity tiers and payout ranges"
            ),
            ChecklistItem(
                id="BB-005",
                description="Document triage workflow: receipt acknowledgement within 24h"
            ),
            ChecklistItem(
                id="BB-006",
                description="Document severity classification within 72h"
            ),
            ChecklistItem(
                id="BB-007",
                description="Assign internal triage team with SLA for critical/high findings"
            ),
            ChecklistItem(
                id="BB-008",
                description="Soft-launch program in private invite mode"
            ),
            ChecklistItem(
                id="BB-009",
                description="Integrate with existing security practices (ZAP DAST, pen test, SAST)"
            ),
            ChecklistItem(
                id="BB-010",
                description="Review legal safe harbor language by counsel"
            )
        ]
        
        for item in checklist_items:
            self.checklist[item.id] = item
        
        logger.info(f"Initialized {len(checklist_items)} checklist items")
    
    @log_execution_time
    @validate_input
    def get_checklist_item(self, item_id: str) -> Optional[ChecklistItem]:
        """
        Get a checklist item by ID.
        
        Args:
            item_id: Checklist item identifier
        
        Returns:
            ChecklistItem if found, None otherwise
        
        Raises:
            TypeError: If item_id is not a string
            ValueError: If item_id is empty
        """
        if not isinstance(item_id, str):
            raise TypeError(f"item_id must be str, got {type(item_id)}")
        if not item_id.strip():
            raise ValueError("item_id cannot be empty")
        
        return self.checklist.get(item_id.strip())
    
    @log_execution_time
    @validate_input
    def update_checklist_item(
        self,
        item_id: str,
        status: Optional[ChecklistStatus] = None,
        assigned_to: Optional[str] = None,
        note: Optional[str] = None
    ) -> ChecklistItem:
        """
        Update a checklist item's status, assignment, or add a note.
        
        Args:
            item_id: Checklist item identifier
            status: New status (optional)
            assigned_to: Person to assign (optional)
            note: Note to add