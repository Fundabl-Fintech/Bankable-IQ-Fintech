"""
Responsible Disclosure Policy - Production Implementation
=========================================================
Owner: Compliance Team | Contact: security@getbankable.io
Version: 2.1.0 | Maturity: compounding_capital
"""

import enum
import logging
import re
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Set, Tuple, Union, Any, Final
from uuid import UUID, uuid4

# Third-party imports (production-ready)
from pydantic import BaseModel, Field, validator, EmailStr, HttpUrl, SecretStr
from pydantic.dataclasses import dataclass as pydantic_dataclass

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            'security_policy.log',
            maxBytes=10_485_760,  # 10MB
            backupCount=5
        )
    ]
)
logger = logging.getLogger(__name__)


class SeverityLevel(str, enum.Enum):
    """Enumeration of vulnerability severity levels with strict validation."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"

    @classmethod
    def from_string(cls, value: str) -> "SeverityLevel":
        """Safe conversion from string with validation."""
        try:
            return cls(value.lower())
        except ValueError:
            logger.error(f"Invalid severity level: {value}")
            raise ValueError(f"Invalid severity: {value}. Must be one of {[e.value for e in cls]}")


class VulnerabilityCategory(str, enum.Enum):
    """Categorized vulnerability types for structured tracking."""
    RCE = "remote_code_execution"
    SQL_INJECTION = "sql_injection"
    AUTH_BYPASS = "authentication_bypass"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    XSS = "cross_site_scripting"
    IDOR = "insecure_direct_object_reference"
    CSRF = "cross_site_request_forgery"
    INFORMATION_DISCLOSURE = "information_disclosure"
    BUSINESS_LOGIC = "business_logic_flaw"
    OTHER = "other"


@dataclass(frozen=True)
class PayoutRange:
    """Immutable payout range with validation."""
    min_amount: float = Field(ge=0, description="Minimum payout in USD")
    max_amount: float = Field(ge=0, description="Maximum payout in USD")

    def __post_init__(self) -> None:
        """Validate payout range consistency."""
        if self.min_amount > self.max_amount:
            logger.error(f"Invalid payout range: min={self.min_amount} > max={self.max_amount}")
            raise ValueError(f"min_amount ({self.min_amount}) cannot exceed max_amount ({self.max_amount})")

    def contains(self, amount: float) -> bool:
        """Check if amount falls within range."""
        return self.min_amount <= amount <= self.max_amount


class SeverityConfig(BaseModel):
    """Configuration model for severity tiers with validation."""
    severity: SeverityLevel
    description: str = Field(..., min_length=10, max_length=500)
    examples: List[str] = Field(..., min_items=1)
    payout_range: PayoutRange
    remediation_hours: int = Field(ge=1, le=2160, description="Remediation SLA in hours")

    @validator('examples')
    def validate_examples(cls, v: List[str]) -> List[str]:
        """Ensure examples are non-empty strings."""
        for example in v:
            if not example.strip():
                raise ValueError("Examples cannot be empty strings")
        return v


class ReportSubmission(BaseModel):
    """Structured vulnerability report submission with full validation."""
    report_id: UUID = Field(default_factory=uuid4)
    vulnerability_description: str = Field(..., min_length=20, max_length=5000)
    affected_systems: List[str] = Field(..., min_items=1)
    steps_to_reproduce: List[str] = Field(..., min_items=1)
    proof_of_concept: Optional[str] = Field(None, max_length=10000)
    impact_assessment: str = Field(..., min_length=20, max_length=2000)
    suggested_fix: Optional[str] = Field(None, max_length=5000)
    researcher_contact: str = Field(..., min_length=3, max_length=200)
    submission_timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    severity: Optional[SeverityLevel] = None
    category: Optional[VulnerabilityCategory] = None

    @validator('affected_systems')
    def validate_systems(cls, v: List[str]) -> List[str]:
        """Validate system identifiers against allowed patterns."""
        allowed_patterns = [
            r'^[\w\-\.]+\.getbankable\.io$',
            r'^api\.getbankable\.io/v[12]/.*$',
            r'^(iOS|Android)\s+app\s+v\d+\.\d+\.\d+$'
        ]
        for system in v:
            if not any(re.match(pattern, system) for pattern in allowed_patterns):
                logger.warning(f"System '{system}' does not match known patterns")
        return v

    @validator('researcher_contact')
    def validate_contact(cls, v: str) -> str:
        """Validate researcher contact format."""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        username_pattern = r'^[a-zA-Z0-9_]{3,50}$'
        if not (re.match(email_pattern, v) or re.match(username_pattern, v)):
            raise ValueError("Contact must be a valid email or username")
        return v


class TriageRecord(BaseModel):
    """Triage workflow record with complete audit trail."""
    submission: ReportSubmission
    triage_status: str = Field(default="received", pattern=r'^(received|in_triage|classified|validated|remediated|closed)$')
    severity_classification: Optional[SeverityLevel] = None
    assigned_team_member: Optional[str] = None
    acknowledgement_timestamp: Optional[datetime] = None
    classification_timestamp: Optional[datetime] = None
    validation_timestamp: Optional[datetime] = None
    remediation_timestamp: Optional[datetime] = None
    bounty_amount: Optional[float] = Field(None, ge=0)
    notes: List[str] = Field(default_factory=list)
    version: int = Field(default=1, ge=1)

    def acknowledge(self, team_member: str) -> None:
        """Acknowledge receipt within 24h SLA."""
        if self.acknowledgement_timestamp:
            raise ValueError("Report already acknowledged")
        self.acknowledgement_timestamp = datetime.now(timezone.utc)
        self.assigned_team_member = team_member
        self.triage_status = "in_triage"
        self.version += 1
        logger.info(f"Report {self.submission.report_id} acknowledged by {team_member}")

    def classify(self, severity: SeverityLevel, category: VulnerabilityCategory) -> None:
        """Classify severity within 72h SLA."""
        if not self.acknowledgement_timestamp:
            raise ValueError("Must acknowledge before classification")
        if self.classification_timestamp:
            raise ValueError("Report already classified")
        
        time_since_ack = (datetime.now(timezone.utc) - self.acknowledgement_timestamp).total_seconds()
        if time_since_ack > 72 * 3600:  # 72 hours
            logger.warning(f"Classification SLA exceeded for {self.submission.report_id}")
        
        self.severity_classification = severity
        self.submission.severity = severity
        self.submission.category = category
        self.classification_timestamp = datetime.now(timezone.utc)
        self.triage_status = "classified"
        self.version += 1
        logger.info(f"Report {self.submission.report_id} classified as {severity.value}")

    def validate(self, bounty_amount: Optional[float] = None) -> None:
        """Validate the report and optionally set bounty."""
        if not self.classification_timestamp:
            raise ValueError("Must classify before validation")
        self.validation_timestamp = datetime.now(timezone.utc)
        self.triage_status = "validated"
        if bounty_amount is not None:
            self.bounty_amount = bounty_amount
        self.version += 1
        logger.info(f"Report {self.submission.report_id} validated with bounty: {bounty_amount}")

    def remediate(self) -> None:
        """Mark report as remediated."""
        if not self.validation_timestamp:
            raise ValueError("Must validate before remediation")
        self.remediation_timestamp = datetime.now(timezone.utc)
        self.triage_status = "remediated"
        self.version += 1
        logger.info(f"Report {self.submission.report_id} remediated")

    def close(self) -> None:
        """Close the triage record."""
        if self.triage_status == "closed":
            raise ValueError("Report already closed")
        self.triage_status = "closed"
        self.version += 1
        logger.info(f"Report {self.submission.report_id} closed")


class BugBountyProgram:
    """Main bug bounty program manager with full lifecycle support."""
    
    def __init__(self, platform: str = "HackerOne", private_mode: bool = True) -> None:
        """Initialize bug bounty program.
        
        Args:
            platform: Bug bounty platform (HackerOne or Bugcrowd)
            private_mode: Whether to start in private invite mode
        """
        self.platform = platform
        self.private_mode = private_mode
        self.severity_configs: Dict[SeverityLevel, SeverityConfig] = {}
        self.triage_records: Dict[UUID, TriageRecord] = {}
        self.scope: Dict[str, List[str]] = {
            "in_scope": [],
            "out_of_scope": []
        }
        self.safe_harbor_approved: bool = False
        self.policy_published: bool = False
        logger.info(f"Bug bounty program initialized on {platform} (private_mode={private_mode})")

    def add_severity_config(self, config: SeverityConfig) -> None:
        """Add severity tier configuration."""
        if config.severity in self.severity_configs:
            logger.warning(f"Overwriting existing config for {config.severity}")
        self.severity_configs[config.severity] = config
        logger.info(f"Added severity config for {config.severity.value}")

    def define_scope(self, in_scope: List[str], out_of_scope: List[str]) -> None:
        """Define program scope."""
        self.scope["in_scope"] = in_scope
        self.scope["out_of_scope"] = out_of_scope
        logger.info(f"Scope defined: {len(in_scope)} in-scope, {len(out_of_scope)} out-of-scope")

    def approve_safe_harbor(self) -> None:
        """Mark safe harbor language as approved by counsel."""
        self.safe_harbor_approved = True
        logger.info("Safe harbor language approved by legal counsel")

    def publish_policy(self) -> None:
        """Publish responsible disclosure policy."""
        if not self.safe_harbor_approved:
            raise ValueError("Safe harbor language must be approved before publishing")
        if not self.severity_configs:
            raise ValueError("Severity configs must be defined before publishing")
        if not self.scope["in_scope"]:
            raise ValueError("In-scope services must be defined before publishing")
        
        self.policy_published = True
        logger.info("Responsible disclosure policy published at security.getbankable.io")

    def submit_report(self, submission: ReportSubmission) -> TriageRecord:
        """Submit a new vulnerability report."""
        if not self.policy_published:
            raise ValueError("Policy must be published before accepting submissions")
        
        record = TriageRecord(submission=submission)
        self.triage_records[submission.report_id] = record
        logger.info(f"New report submitted: {submission.report_id}")
        return record

    def get_triage_record(self, report_id: UUID) -> Optional[TriageRecord]:
        """Get triage record by report ID."""
        return self.triage_records.get(report_id)

    def get_statistics(self) -> Dict[str, Any]:
        """Get program statistics."""
        stats = {
            "total_reports": len(self.triage_records),
            "by_status": {},
            "by_severity": {},
            "total_bounties_paid": 0.0,
            "average_response_time_hours": 0.0
        }
        
        response_times = []
        for record in self.triage_records.values():
            # Count by status
            stats["by_status"][record.triage_status] = stats["by_status"].get(record.triage_status, 0) + 1
            
            # Count by severity
            if record.severity_classification:
                sev = record.severity_classification.value
                stats["by_severity"][sev] = stats["by_severity"].get(sev, 0) + 1
            
            # Sum bounties
            if record.bounty_amount:
                stats["total_bounties_paid"] += record.bounty_amount
            
            # Calculate response times
            if record.acknowledgement_timestamp and record.submission.submission_timestamp:
                response_time = (record.acknowledgement_timestamp - record.submission.submission_timestamp).total_seconds() / 3600
                response_times.append(response_time)
        
        if response_times:
            stats["average_response_time_hours"] = sum(response_times) / len(response_times)
        
        return stats

    def launch_public(self) -> None:
        """Launch program publicly for Phase 3."""
        if not self.policy_published:
            raise ValueError("Policy must be published before public launch")
        if not self.safe_harbor_approved:
            raise ValueError("Safe harbor must be approved before public launch")
        
        self.private_mode = False
        logger.info("Bug bounty program launched publicly for Phase 3")


class BugBountyManager:
    """High-level manager for bug bounty program lifecycle."""
    
    def __init__(self) -> None:
        """Initialize bug bounty manager."""
        self.program: Optional[BugBountyProgram] = None
        self.integrations: Dict[str, Any] = {}
        logger.info("Bug bounty manager initialized")

    def create_program(self, platform: str = "HackerOne", private_mode: bool = True) -> BugBountyProgram:
        """Create a new bug bounty program."""
        self.program = BugBountyProgram(platform=platform, private_mode=private_mode)
        logger.info(f"Created bug bounty program on {platform}")
        return self.program

    def integrate_with_security_tools(self, tool_name: str, config: Dict[str, Any]) -> None:
        """Integrate with existing security tools (ZAP, SAST, etc.)."""
        self.integrations[tool_name] = config
        logger.info(f"Integrated with {tool_name}")

    def get_integration_status(self) -> Dict[str, bool]:
        """Get integration status for all security tools."""
        return {name: True for name in self.integrations}

    def validate_phase_3_readiness(self) -> Tuple[bool, List[str]]:
        """Validate program readiness for Phase 3 launch."""
        issues = []
        
        if not self.program:
            issues.append("No bug bounty program created")
            return False, issues
        
        if not self.program.policy_published:
            issues.append("Responsible disclosure policy not published")
        
        if not self.program.safe_harbor_approved:
            issues.append("Safe harbor language not approved")
        
        if not self.program.severity_configs:
            issues.append("Severity configurations not defined")
        
        if not self.program.scope["in_scope"]:
            issues.append("In-scope services not defined")
        
        if not self.integrations:
            issues.append("No security tool integrations configured")
        
        return len(issues) == 0, issues


# Production-ready singleton instance
bug_bounty_manager = BugBountyManager()

__all__ = [
    'SeverityLevel',
    'VulnerabilityCategory',
    'PayoutRange',
    'SeverityConfig',
    'ReportSubmission',
    'TriageRecord',
    'BugBountyProgram',
    'BugBountyManager',
    'bug_bounty_manager'
]