"""
compliance/security_findings_tracker.py

Unified security findings tracker that ingests bug bounty reports (HackerOne/Bugcrowd)
alongside ZAP DAST, pen test, and SAST results. Provides a single source of truth
for all application security findings with severity classification, SLA tracking,
and phase-gate readiness for §16.3 Phase 3 public marketplace launch.

Owner: service:compliance
Depends on: §10.4 application security practices, §11.2 CI/CD pipeline, §16.3 Phase 3
Blocks: §16.3 Phase 3 public marketplace launch
Maturity target: compounding_capital
"""

from __future__ import annotations

import csv
import datetime
import enum
import hashlib
import json
import logging
import os
import re
import uuid
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from urllib.parse import urlparse

import yaml

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Enums & Constants
# ---------------------------------------------------------------------------

class FindingSource(enum.Enum):
    """Origin of the security finding."""
    ZAP_DAST = "zap_dast"
    PEN_TEST = "pen_test"
    SAST = "sast"
    BUG_BOUNTY = "bug_bounty"


class Severity(enum.Enum):
    """Severity tiers aligned with bug bounty programs and industry standards."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"

    def __ge__(self, other: "Severity") -> bool:
        order = [self.CRITICAL, self.HIGH, self.MEDIUM, self.LOW, self.INFORMATIONAL]
        return order.index(self) <= order.index(other)

    def __gt__(self, other: "Severity") -> bool:
        order = [self.CRITICAL, self.HIGH, self.MEDIUM, self.LOW, self.INFORMATIONAL]
        return order.index(self) < order.index(other)


class FindingStatus(enum.Enum):
    """Lifecycle status of a security finding."""
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    TRIAGING = "triaging"
    IN_REMEDIATION = "in_remediation"
    RESOLVED = "resolved"
    ACCEPTED_RISK = "accepted_risk"
    FALSE_POSITIVE = "false_positive"
    DUPLICATE = "duplicate"


class BugBountyPlatform(enum.Enum):
    """Supported bug bounty platforms."""
    HACKERONE = "hackerone"
    BUGCROWD = "bugcrowd"
    INTERNAL = "internal"


# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

@dataclass
class BugBountyReport:
    """Represents a bug bounty submission from HackerOne, Bugcrowd, or internal."""
    report_id: str
    platform: BugBountyPlatform
    external_id: str
    title: str
    description: str
    vulnerability_type: str
    severity: Severity
    reporter: str
    submitted_at: datetime.datetime
    asset: str
    payout_range: Optional[Tuple[float, float]] = None
    safe_harbor_confirmed: bool = False
    scope_in_scope: bool = True
    attachments: List[str] = field(default_factory=list)
    platform_metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        d = asdict(self)
        d["platform"] = self.platform.value
        d["severity"] = self.severity.value
        d["submitted_at"] = self.submitted_at.isoformat()
        return d


@dataclass
class SecurityFinding:
    """Unified security finding from any source (DAST, SAST, pen test, bug bounty)."""
    finding_id: str
    source: FindingSource
    title: str
    description: str
    severity: Severity
    status: FindingStatus
    discovered_at: datetime.datetime
    asset: str
    vulnerability_id: Optional[str] = None
    remediation: Optional[str] = None
    remediation_deadline: Optional[datetime.datetime] = None
    assigned_to: Optional[str] = None
    sla_breached: bool = False
    bug_bounty_report: Optional[BugBountyReport] = None
    tool_name: Optional[str] = None
    raw_data: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    created_at: datetime.datetime = field(default_factory=datetime.datetime.utcnow)
    updated_at: datetime.datetime = field(default_factory=datetime.datetime.utcnow)

    def __post_init__(self) -> None:
        """Initialize finding_id if not provided."""
        if not self.finding_id:
            self.finding_id = str(uuid.uuid4())

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        d = asdict(self)
        d["source"] = self.source.value
        d["severity"] = self.severity.value
        d["status"] = self.status.value
        d["discovered_at"] = self.discovered_at.isoformat()
        d["created_at"] = self.created_at.isoformat()
        d["updated_at"] = self.updated_at.isoformat()
        if self.remediation_deadline:
            d["remediation_deadline"] = self.remediation_deadline.isoformat()
        if self.bug_bounty_report:
            d["bug_bounty_report"] = self.bug_bounty_report.to_dict()
        return d


# ---------------------------------------------------------------------------
# SLA Configuration
# ---------------------------------------------------------------------------

@dataclass
class SLADefinition:
    """SLA thresholds for finding acknowledgement and triage."""
    acknowledge_hours: int
    triage_hours: int
    remediate_days: Optional[int] = None


DEFAULT_SLA_CONFIG: Dict[Severity, SLADefinition] = {
    Severity.CRITICAL: SLADefinition(acknowledge_hours=4, triage_hours=24, remediate_days=7),
    Severity.HIGH: SLADefinition(acknowledge_hours=8, triage_hours=48, remediate_days=30),
    Severity.MEDIUM: SLADefinition(acknowledge_hours=24, triage_hours=72, remediate_days=90),
    Severity.LOW: SLADefinition(acknowledge_hours=48, triage_hours=120, remediate_days=180),
    Severity.INFORMATIONAL: SLADefinition(acknowledge_hours=72, triage_hours=168, remediate_days=None),
}

BUG_BOUNTY_SLA = SLADefinition(acknowledge_hours=24, triage_hours=72)


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class FindingsTrackerError(Exception):
    """Base exception for findings tracker errors."""
    pass


class IngestionError(FindingsTrackerError):
    """Raised when ingestion of a report fails."""
    pass


class ValidationError(FindingsTrackerError):
    """Raised when validation of finding data fails."""
    pass


class StorageError(FindingsTrackerError):
    """Raised when storage operations fail."""
    pass


# ---------------------------------------------------------------------------
# Findings Tracker
# ---------------------------------------------------------------------------

class SecurityFindingsTracker:
    """
    Central tracker for all security findings across sources.
    Supports ingestion from ZAP DAST, pen test reports, SAST tools,
    and bug bounty platforms (HackerOne, Bugcrowd, internal).
    """

    def __init__(
        self,
        storage_path: Optional[Path] = None,
        sla_config: Optional[Dict[Severity, SLADefinition]] = None,
        bug_bounty_sla: Optional[SLADefinition] = None,
    ) -> None:
        """
        Initialize the findings tracker.

        Args:
            storage_path: Path to store findings data. Defaults to compliance/data/security_findings.
            sla_config: Custom SLA configuration per severity. Defaults to DEFAULT_SLA_CONFIG.
            bug_bounty_sla: Custom SLA for bug bounty findings. Defaults to BUG_BOUNTY_SLA.

        Raises:
            StorageError: If storage directory cannot be created.
        """
        self._findings: Dict[str, SecurityFinding] = {}
        self._storage_path = storage_path or Path("compliance/data/security_findings")
        self._sla_config = sla_config or DEFAULT_SLA_CONFIG
        self._bug_bounty_sla = bug_bounty_sla or BUG_BOUNTY_SLA
        self._initialized = False

        try:
            self._initialize_storage()
        except OSError as e:
            logger.error("Failed to initialize storage at %s: %s", self._storage_path, e)
            raise StorageError(f"Cannot create storage directory: {e}") from e

    def _initialize_storage(self) -> None:
        """Create storage directory if it doesn't exist."""
        try:
            self._storage_path.mkdir(parents=True, exist_ok=True)
            self._initialized = True
            logger.info("Storage initialized at %s", self._storage_path)
        except OSError as e:
            logger.error("Failed to create storage directory %s: %s", self._storage_path, e)
            raise StorageError(f"Cannot create storage directory: {e}") from e

    def _validate_finding(self, finding: SecurityFinding) -> None:
        """
        Validate a security finding before ingestion.

        Args:
            finding: The security finding to validate.

        Raises:
            ValidationError: If validation fails.
        """
        if not finding.title or not finding.title.strip():
            raise ValidationError("Finding title cannot be empty")
        
        if not finding.asset or not finding.asset.strip():
            raise ValidationError("Finding asset cannot be empty")
        
        if not isinstance(finding.severity, Severity):
            raise ValidationError(f"Invalid severity: {finding.severity}")
        
        if not isinstance(finding.source, FindingSource):
            raise ValidationError(f"Invalid source: {finding.source}")
        
        if not isinstance(finding.status, FindingStatus):
            raise ValidationError(f"Invalid status: {finding.status}")

    def _validate_bug_bounty_report(self, report: BugBountyReport) -> None:
        """
        Validate a bug bounty report before ingestion.

        Args:
            report: The bug bounty report to validate.

        Raises:
            ValidationError: If validation fails.
        """
        if not report.title or not report.title.strip():
            raise ValidationError("Bug bounty report title cannot be empty")
        
        if not report.reporter or not report.reporter.strip():
            raise ValidationError("Bug bounty report reporter cannot be empty")
        
        if not isinstance(report.platform, BugBountyPlatform):
            raise ValidationError(f"Invalid bug bounty platform: {report.platform}")
        
        if not isinstance(report.severity, Severity):
            raise ValidationError(f"Invalid severity in bug bounty report: {report.severity}")

    def _calculate_sla_deadline(
        self,
        finding: SecurityFinding,
        sla_def: SLADefinition,
    ) -> Optional[datetime.datetime]:
        """
        Calculate SLA deadline based on finding discovery time and SLA definition.

        Args:
            finding: The security finding.
            sla_def: SLA definition to apply.

        Returns:
            Calculated deadline datetime or None if not applicable.
        """
        if sla_def.remediate_days is not None:
            return finding.discovered_at + datetime.timedelta(days=sla_def.remediate_days)
        return None

    def _check_sla_breach(self, finding: SecurityFinding) -> bool:
        """
        Check if a finding has breached its SLA.

        Args:
            finding: The security finding to check.

        Returns:
            True if SLA is breached, False otherwise.
        """
        now = datetime.datetime.utcnow()
        
        if finding.source == FindingSource.BUG_BOUNTY:
            sla_def = self._bug_bounty_sla
        else:
            sla_def = self._sla_config.get(finding.severity)
        
        if not sla_def:
            logger.warning("No SLA definition for severity %s", finding.severity)
            return False
        
        acknowledge_deadline = finding.discovered_at + datetime.timedelta(hours=sla_def.acknowledge_hours)
        triage_deadline = finding.discovered_at + datetime.timedelta(hours=sla_def.triage_hours)
        
        if finding.status in (FindingStatus.NEW, FindingStatus.ACKNOWLEDGED) and now > acknowledge_deadline:
            return True
        
        if finding.status in (FindingStatus.NEW, FindingStatus.ACKNOWLEDGED, FindingStatus.TRIAGING) and now > triage_deadline:
            return True
        
        if finding.remediation_deadline and finding.status not in (FindingStatus.RESOLVED, FindingStatus.ACCEPTED_RISK, FindingStatus.FALSE_POSITIVE, FindingStatus.DUPLICATE):
            if now > finding.remediation_deadline:
                return True
        
        return False

    def _generate_finding_hash(self, finding: SecurityFinding) -> str:
        """
        Generate a unique hash for a finding to detect duplicates.

        Args:
            finding: The security finding.

        Returns:
            SHA-256 hash string.
        """
        hash_input = f"{finding.source.value}:{finding.title}:{finding.asset}:{finding.severity.value}"
        return hashlib.sha256(hash_input.encode()).hexdigest()

    def _is_duplicate(self, finding: SecurityFinding) -> bool:
        """
        Check if a finding is a duplicate of an existing one.

        Args:
            finding: The security finding to check.

        Returns:
            True if duplicate found, False otherwise.
        """
        finding_hash = self._generate_finding_hash(finding)
        
        for existing_finding in self._findings.values():
            existing_hash = self._generate_finding_hash(existing_finding)
            if finding_hash == existing_hash:
                return True
        
        return False

    def ingest_finding(self, finding: SecurityFinding) -> str:
        """
        Ingest a security finding into the tracker.

        Args:
            finding: The security finding to ingest.

        Returns:
            The finding ID.

        Raises:
            ValidationError: If the finding is invalid.
            IngestionError: If ingestion fails.
        """
        try:
            self._validate_finding(finding)
        except ValidationError as e:
            logger.error("Validation failed for finding: %s", e)
            raise
        
        try:
            if self._is_duplicate(finding):
                finding.status = FindingStatus.DUPLICATE
                logger.info("Duplicate finding detected: %s", finding.title)
            
            finding.sla_breached = self._check_sla_breach(finding)
            
            if finding.source == FindingSource.BUG_BOUNTY:
                sla_def = self._bug_bounty_sla
            else:
                sla_def = self._sla_config.get(finding.severity)
            
            if sla_def:
                finding.remediation_deadline = self._calculate_sla_deadline(finding, sla_def)
            
            self._findings[finding.finding_id] = finding
            logger.info("Ingested finding %s: %s (%s)", finding.finding_id, finding.title, finding.severity.value)
            
            return finding.finding_id
            
        except Exception as e:
            logger.error("Failed to ingest finding: %s", e)
            raise IngestionError(f"Failed to ingest finding: {e}") from e

    def ingest_bug_bounty_report(self, report: BugBountyReport) -> str:
        """
        Ingest a bug bounty report and create a corresponding security finding.

        Args:
            report: The bug bounty report to ingest.

        Returns:
            The finding ID.

        Raises:
            ValidationError: If the report is invalid.
            IngestionError: If ingestion fails.
        """
        try:
            self._validate_bug_bounty_report(report)
        except ValidationError as e:
            logger.error("Validation failed for bug bounty report: %s", e)
            raise
        
        try:
            finding = SecurityFinding(
                finding_id=str(uuid.uuid4()),
                source=FindingSource.BUG_BOUNTY,
                title=report.title,
                description=report.description,
                severity=report.severity,
                status=FindingStatus.NEW,
                discovered_at=report.submitted_at,
                asset=report.asset,
                bug_bounty_report=report,
                tool_name=report.platform.value,
                tags=["bug_bounty", report.platform.value],
            )
            
            return self.ingest_finding(finding)
            
        except (ValidationError, IngestionError) as e:
            logger.error("Failed to ingest bug bounty report: %s", e)
            raise
        except Exception as e:
            logger.error("Unexpected error ingesting bug bounty report: %s", e)
            raise IngestionError(f"Failed to ingest bug bounty report: {e}") from e

    def ingest_zap_dast_report(self, report_data: Dict[str, Any]) -> List[str]:
        """
        Ingest findings from a ZAP DAST report.

        Args:
            report_data: ZAP DAST report data as dictionary.

        Returns:
            List of finding IDs.

        Raises:
            IngestionError: If ingestion fails.
        """
        finding_ids: List[str] = []
        
        try:
            alerts = report_data.get("alerts", [])
            if not alerts:
                logger.warning("ZAP DAST report contains no alerts")
                return finding_ids
            
            for alert in alerts:
                try:
                    severity_map = {
                        "High": Severity.HIGH,
                        "Medium": Severity.MEDIUM,
                        "Low": Severity.LOW,
                        "Informational": Severity.INFORMATIONAL,
                    }
                    
                    severity = severity_map.get(alert.get("risk", ""), Severity.INFORMATIONAL)
                    
                    finding = SecurityFinding(
                        finding_id=str(uuid.uuid4()),
                        source=FindingSource.ZAP_DAST,
                        title=alert.get("name", "Unknown ZAP Alert"),
                        description=alert.get("description", ""),
                        severity=severity,
                        status=FindingStatus.NEW,
                        discovered_at