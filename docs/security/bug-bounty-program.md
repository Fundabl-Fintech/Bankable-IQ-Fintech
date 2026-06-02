"""
Bug Bounty Program Management Module

Owner: Service: Compliance
Status: Private Invite Mode (Pre-Launch)
Last Updated: 2026-06-02

This module implements the bug bounty program management system for GetBankable,
providing comprehensive vulnerability tracking, triage workflow automation, and
integration with existing security practices. The program operates in private
invite mode until Phase 3 public marketplace launch.

Requirements:
    - Python 3.11+
    - HackerOne API access
    - Jira API access
    - Redis for caching
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import logging.handlers
import re
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from enum import Enum, auto
from functools import lru_cache, wraps
from pathlib import Path
from typing import (
    Any,
    Callable,
    Dict,
    Final,
    FrozenSet,
    Generic,
    List,
    Optional,
    Protocol,
    Set,
    Tuple,
    TypeVar,
    Union,
    cast,
)
from urllib.parse import urlparse, urljoin

import aiohttp
import async_timeout
import backoff
import pydantic
from pydantic import BaseModel, Field, validator, root_validator
from pydantic.networks import AnyUrl, HttpUrl
from pydantic.types import SecretStr, constr, conint, confloat
from redis import asyncio as aioredis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            "bug_bounty.log", maxBytes=10_485_760, backupCount=5
        ),
    ],
)
logger = logging.getLogger(__name__)

# Type variables for generic implementations
T = TypeVar("T", bound="BaseModel")
V = TypeVar("V")
SeverityT = TypeVar("SeverityT", bound="SeverityLevel")

# Constants
MAX_RETRIES: Final[int] = 3
CACHE_TTL: Final[int] = 300  # 5 minutes
RATE_LIMIT_CALLS: Final[int] = 100
RATE_LIMIT_PERIOD: Final[int] = 60  # seconds
ACKNOWLEDGEMENT_SLA_HOURS: Final[int] = 24
CLASSIFICATION_SLA_HOURS: Final[int] = 72
CRITICAL_REMEDIATION_DAYS: Final[int] = 7
HIGH_REMEDIATION_DAYS: Final[int] = 14
MEDIUM_REMEDIATION_DAYS: Final[int] = 30
LOW_REMEDIATION_DAYS: Final[int] = 90
BOUNTY_PAYMENT_DAYS: Final[int] = 30

# Security constants
HASH_ALGORITHM: Final[str] = "sha256"
SALT_LENGTH: Final[int] = 32
TOKEN_EXPIRY_HOURS: Final[int] = 24


class BugBountyError(Exception):
    """Base exception for bug bounty program errors."""


class ValidationError(BugBountyError):
    """Raised when input validation fails."""


class AuthenticationError(BugBountyError):
    """Raised when API authentication fails."""


class RateLimitError(BugBountyError):
    """Raised when rate limit is exceeded."""


class NotFoundError(BugBountyError):
    """Raised when requested resource is not found."""


class IntegrationError(BugBountyError):
    """Raised when external integration fails."""


class SeverityLevel(str, Enum):
    """Severity classification levels for vulnerabilities."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

    @classmethod
    def from_string(cls, value: str) -> "SeverityLevel":
        """Create severity level from string with validation."""
        try:
            return cls(value.lower())
        except ValueError:
            raise ValidationError(f"Invalid severity level: {value}")

    @property
    def remediation_days(self) -> int:
        """Get remediation SLA in days based on severity."""
        return {
            SeverityLevel.CRITICAL: CRITICAL_REMEDIATION_DAYS,
            SeverityLevel.HIGH: HIGH_REMEDIATION_DAYS,
            SeverityLevel.MEDIUM: MEDIUM_REMEDIATION_DAYS,
            SeverityLevel.LOW: LOW_REMEDIATION_DAYS,
        }[self]

    @property
    def payout_range(self) -> Tuple[int, int]:
        """Get payout range for severity level."""
        return {
            SeverityLevel.CRITICAL: (5000, 15000),
            SeverityLevel.HIGH: (2000, 5000),
            SeverityLevel.MEDIUM: (500, 2000),
            SeverityLevel.LOW: (100, 500),
        }[self]


class FindingStatus(str, Enum):
    """Status tracking for vulnerability findings."""

    SUBMITTED = "submitted"
    ACKNOWLEDGED = "acknowledged"
    CLASSIFIED = "classified"
    INVESTIGATING = "investigating"
    REMEDIATING = "remediating"
    VERIFIED = "verified"
    RESOLVED = "resolved"
    DISPUTED = "disputed"
    CLOSED = "closed"


class TriageMilestone(str, Enum):
    """Triage workflow milestones with SLA tracking."""

    ACKNOWLEDGEMENT = "acknowledgement"
    CLASSIFICATION = "classification"
    INITIAL_TRIAGE = "initial_triage"
    REMEDIATION = "remediation"
    PAYMENT = "payment"


class PayoutMultiplier(float, Enum):
    """Bonus multipliers for qualifying reports."""

    FIRST_REPORT = 1.5
    CRITICAL_POC = 1.25
    CLEAR_REMEDIATION = 1.1


@dataclass(frozen=True)
class ServiceEndpoint:
    """Immutable service endpoint configuration."""

    name: str
    domain: str
    description: str
    is_active: bool = True
    requires_auth: bool = True

    def __post_init__(self) -> None:
        """Validate endpoint configuration."""
        if not self.name or not self.name.strip():
            raise ValidationError("Service name cannot be empty")
        if not self.domain or not self.domain.strip():
            raise ValidationError("Domain cannot be empty")
        if not re.match(r"^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", self.domain):
            raise ValidationError(f"Invalid domain format: {self.domain}")

    @property
    def url(self) -> str:
        """Get full URL for the service."""
        return f"https://{self.domain}"


class InScopeServices:
    """Container for in-scope service definitions."""

    SERVICES: Final[FrozenSet[ServiceEndpoint]] = frozenset([
        ServiceEndpoint("Web Application", "app.getbankable.io", "Core platform"),
        ServiceEndpoint("API Gateway", "api.getbankable.io", "All API endpoints"),
        ServiceEndpoint("Marketplace", "marketplace.getbankable.io", "Phase 3 launch target"),
        ServiceEndpoint("Authentication Service", "auth.getbankable.io", "OAuth2/OIDC flows"),
        ServiceEndpoint("Payment Processing", "payments.getbankable.io", "Transaction handling"),
        ServiceEndpoint("Document Service", "docs.getbankable.io", "KYC/KYB document upload"),
        ServiceEndpoint("Notification Service", "notifications.getbankable.io", "Email, SMS, webhook delivery"),
        ServiceEndpoint("Admin Dashboard", "admin.getbankable.io", "Internal operations"),
    ])

    @classmethod
    def get_active_services(cls) -> FrozenSet[ServiceEndpoint]:
        """Get all active in-scope services."""
        return frozenset(s for s in cls.SERVICES if s.is_active)

    @classmethod
    def is_in_scope(cls, domain: str) -> bool:
        """Check if a domain is within the bug bounty scope."""
        return any(s.domain == domain for s in cls.SERVICES)


class OutOfScopeRules:
    """Defines out-of-scope testing categories."""

    RULES: Final[FrozenSet[str]] = frozenset([
        "third_party_services",
        "physical_security",
        "social_engineering",
        "denial_of_service",
        "rate_limiting_bypass",
        "self_xss",
        "clickjacking_non_sensitive",
        "missing_security_headers",
        "tls_ssl_configuration",
        "pre_release_environments",
        "employee_accounts",
        "automated_scanning",
    ])

    @classmethod
    def is_allowed(cls, test_type: str) -> bool:
        """Check if a test type is allowed."""
        return test_type.lower() not in cls.RULES


@dataclass
class ResearcherProfile:
    """Researcher profile with validation."""

    hackerone_username: str
    reputation_score: float = 0.0
    total_reports: int = 0
    accepted_reports: int = 0
    total_bounties: float = 0.0
    is_trusted: bool = False
    joined_date: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_report_date: Optional[datetime] = None

    def __post_init__(self) -> None:
        """Validate researcher profile."""
        if not self.hackerone_username or not self.hackerone_username.strip():
            raise ValidationError("HackerOne username cannot be empty")
        if self.reputation_score < 0:
            raise ValidationError("Reputation score cannot be negative")
        if self.total_reports < 0:
            raise ValidationError("Total reports cannot be negative")
        if self.accepted_reports < 0:
            raise ValidationError("Accepted reports cannot be negative")
        if self.accepted_reports > self.total_reports:
            raise ValidationError("Accepted reports cannot exceed total reports")
        if self.total_bounties < 0:
            raise ValidationError("Total bounties cannot be negative")

    @property
    def acceptance_rate(self) -> float:
        """Calculate report acceptance rate."""
        if self.total_reports == 0:
            return 0.0
        return self.accepted_reports / self.total_reports

    def update_reputation(self, finding: "VulnerabilityFinding") -> None:
        """Update researcher reputation based on finding."""
        severity_multiplier = {
            SeverityLevel.CRITICAL: 10.0,
            SeverityLevel.HIGH: 5.0,
            SeverityLevel.MEDIUM: 2.0,
            SeverityLevel.LOW: 1.0,
        }
        self.reputation_score += severity_multiplier.get(finding.severity, 0.5)
        self.total_reports += 1
        self.last_report_date = datetime.now(timezone.utc)


class VulnerabilityFinding(BaseModel):
    """Pydantic model for vulnerability finding with comprehensive validation."""

    id: str = Field(default_factory=lambda: hashlib.sha256(str(time.time()).encode()).hexdigest()[:16])
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=5000)
    severity: SeverityLevel
    status: FindingStatus = FindingStatus.SUBMITTED
    researcher: ResearcherProfile
    service: ServiceEndpoint
    endpoint: str = Field(..., max_length=500)
    cvss_score: Optional[float] = Field(None, ge=0.0, le=10.0)
    cve_id: Optional[str] = None
    poc_available: bool = False
    remediation_steps: Optional[str] = Field(None, max_length=2000)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    acknowledged_at: Optional[datetime] = None
    classified_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    bounty_amount: Optional[float] = Field(None, ge=0.0)
    payment_status: bool = False
    tags: Set[str] = Field(default_factory=set)
    internal_notes: Optional[str] = Field(None, max_length=2000)

    @validator("endpoint")
    def validate_endpoint(cls, value: str) -> str:
        """Validate endpoint URL format."""
        if not value.startswith("/") and not value.startswith("https://"):
            raise ValueError("Endpoint must start with '/' or 'https://'")
        return value

    @validator("cvss_score")
    def validate_cvss(cls, value: Optional[float]) -> Optional[float]:
        """Validate CVSS score if provided."""
        if value is not None:
            if value < 0 or value > 10:
                raise ValueError("CVSS score must be between 0 and 10")
        return value

    @validator("cve_id")
    def validate_cve(cls, value: Optional[str]) -> Optional[str]:
        """Validate CVE ID format if provided."""
        if value is not None:
            if not re.match(r"^CVE-\d{4}-\d{4,}$", value):
                raise ValueError("Invalid CVE ID format")
        return value

    def acknowledge(self) -> None:
        """Acknowledge finding receipt."""
        self.status = FindingStatus.ACKNOWLEDGED
        self.acknowledged_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def classify(self, severity: SeverityLevel) -> None:
        """Classify finding severity."""
        self.severity = severity
        self.status = FindingStatus.CLASSIFIED
        self.classified_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)

    def calculate_bounty(self) -> float:
        """Calculate bounty amount based on severity and multipliers."""
        base_amount = sum(self.severity.payout_range) / 2
        multiplier = 1.0

        if self.researcher.total_reports == 1:
            multiplier *= PayoutMultiplier.FIRST_REPORT.value
        if self.poc_available and self.severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH]:
            multiplier *= PayoutMultiplier.CRITICAL_POC.value
        if self.remediation_steps:
            multiplier *= PayoutMultiplier.CLEAR_REMEDIATION.value

        return round(base_amount * multiplier, 2)


class TriageWorkflow:
    """Triage workflow manager with SLA tracking and escalation."""

    def __init__(self, redis_client: aioredis.Redis) -> None:
        """Initialize triage workflow with Redis client."""
        self.redis = redis_client
        self._sla_monitor = SLAMonitor(redis_client)

    async def process_finding(self, finding: VulnerabilityFinding) -> None:
        """Process a new vulnerability finding through triage workflow."""
        try:
            logger.info(f"Processing finding {finding.id} from {finding.researcher.hackerone_username}")

            # Step 1: Acknowledge receipt (within 24h SLA)
            finding.acknowledge()
            await self._store_finding(finding)
            await self._send_acknowledgement(finding)

            # Step 2: Initial severity classification (within 72h SLA)
            await self._classify_finding(finding)

            # Step 3: Assign to internal triage team
            await self._assign_triage_team(finding)

            # Step 4: Track SLA compliance
            await self._sla_monitor.track_milestone(
                finding.id,
                TriageMilestone.ACKNOWLEDGEMENT,
                finding.acknowledged_at
            )

            logger.info(f"Finding {finding.id} processed successfully")

        except RedisError as e:
            logger.error(f"Redis error processing finding {finding.id}: {e}")
            raise IntegrationError(f"Failed to process finding: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error processing finding {finding.id}: {e}")
            raise

    async def _store_finding(self, finding: VulnerabilityFinding) -> None:
        """Store finding in Redis cache."""
        try:
            key = f"finding:{finding.id}"
            await self.redis.setex(
                key,
                CACHE_TTL,
                finding.json()
            )
        except RedisError as e:
            logger.error(f"Failed to store finding {finding.id}: {e}")
            raise

    async def _send_acknowledgement(self, finding: VulnerabilityFinding) -> None:
        """Send acknowledgement to researcher."""
        try:
            # Simulate sending acknowledgement via HackerOne API
            logger.info(f"Acknowledgement sent to {finding.researcher.hackerone_username} for finding {finding.id}")
        except Exception as e:
            logger.error(f"Failed to send acknowledgement: {e}")
            raise IntegrationError(f"Failed to send acknowledgement: {e}") from e

    async def _classify_finding(self, finding: VulnerabilityFinding) -> None:
        """Classify finding severity."""
        try:
            # Simulate severity classification logic
            if finding.cvss_score is not None:
                if finding.cvss_score >= 9.0:
                    severity = SeverityLevel.CRITICAL
                elif finding.cvss_score >= 7.0:
                    severity = SeverityLevel.HIGH
                elif finding.cvss_score >= 4.0:
                    severity = SeverityLevel.MEDIUM
                else:
                    severity = SeverityLevel.LOW
            else:
                severity = SeverityLevel.MEDIUM  # Default classification

            finding.classify(severity)
            logger.info(f"Finding {finding.id} classified as {severity.value}")

        except Exception as e:
            logger.error(f"Failed to classify finding {finding.id}: {e}")
            raise

    async def _assign_triage_team(self, finding: VulnerabilityFinding) -> None:
        """Assign finding to internal triage team."""