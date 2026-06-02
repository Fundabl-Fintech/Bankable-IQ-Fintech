"""
Application Security Practices Implementation — OWASP ASVS
==========================================================

Owner: Service: Compliance
Spec Reference: §10.4
Maturity Target: Lender Ready
Last Reviewed: 2026-06-02
Next Review: 2026-07-02

This module implements comprehensive security controls per OWASP ASVS Level 2
baseline (Level 3 for compliance-svc and credit-svc), including SAST, DAST, SCA,
secret scanning, penetration testing, and bug bounty program management.
"""

import json
import logging
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from dataclasses import dataclass, field, asdict
from abc import ABC, abstractmethod
from uuid import uuid4
from functools import lru_cache
from contextlib import contextmanager

# Third-party imports (with type stubs)
import yaml
from pydantic import BaseModel, Field, validator, ValidationError, root_validator

# Configure structured logging with JSON format for production
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('security_practices.log')
    ]
)
logger = logging.getLogger(__name__)


# =============================================================================
# Custom Exceptions
# =============================================================================

class SecurityConfigError(Exception):
    """Base exception for security configuration errors."""
    pass

class InvalidSeverityError(SecurityConfigError):
    """Raised when an invalid severity level is provided."""
    pass

class InvalidCVSSError(SecurityConfigError):
    """Raised when an invalid CVSS score is provided."""
    pass

class InvalidCVEFormatError(SecurityConfigError):
    """Raised when an invalid CVE ID format is provided."""
    pass

class FindingNotFoundError(Exception):
    """Raised when a security finding is not found."""
    pass

class ControlNotFoundError(Exception):
    """Raised when an ASVS control is not found."""
    pass

class SLAExceededError(Exception):
    """Raised when a finding's SLA has been exceeded."""
    pass

class ValidationError(Exception):
    """Raised when data validation fails."""
    pass


# =============================================================================
# Enums and Constants
# =============================================================================

class Severity(Enum):
    """Security finding severity levels following OWASP Risk Rating."""
    CRITICAL = auto()
    HIGH = auto()
    MEDIUM = auto()
    LOW = auto()
    INFORMATIONAL = auto()

    def __ge__(self, other: 'Severity') -> bool:
        """Compare severity levels."""
        severity_order = [
            Severity.INFORMATIONAL,
            Severity.LOW,
            Severity.MEDIUM,
            Severity.HIGH,
            Severity.CRITICAL
        ]
        return severity_order.index(self) >= severity_order.index(other)

    def __lt__(self, other: 'Severity') -> bool:
        """Compare severity levels."""
        return not self.__ge__(other)

    @classmethod
    def from_string(cls, value: str) -> 'Severity':
        """Create Severity from string value."""
        try:
            return cls[value.upper()]
        except KeyError:
            raise InvalidSeverityError(f"Invalid severity: {value}")


class ASVSLevel(Enum):
    """OWASP ASVS verification levels."""
    LEVEL_1 = 1
    LEVEL_2 = 2
    LEVEL_3 = 3

    @classmethod
    def from_int(cls, value: int) -> 'ASVSLevel':
        """Create ASVSLevel from integer value."""
        try:
            return cls(value)
        except ValueError:
            raise ValueError(f"Invalid ASVS level: {value}")


class ControlStatus(Enum):
    """Status of an ASVS control implementation."""
    IMPLEMENTED = "Implemented"
    PARTIAL = "Partial"
    NOT_APPLICABLE = "Not Applicable"

    @classmethod
    def from_string(cls, value: str) -> 'ControlStatus':
        """Create ControlStatus from string value."""
        try:
            return cls(value.capitalize())
        except ValueError:
            raise ValueError(f"Invalid control status: {value}")


class FindingSource(Enum):
    """Source of security findings."""
    SAST = "SAST"
    DAST = "DAST"
    SCA = "SCA"
    SECRET_SCAN = "Secret Scan"
    PEN_TEST = "Penetration Test"
    BUG_BOUNTY = "Bug Bounty"

    @classmethod
    def from_string(cls, value: str) -> 'FindingSource':
        """Create FindingSource from string value."""
        try:
            return cls(value.replace('_', ' ').title())
        except ValueError:
            raise ValueError(f"Invalid finding source: {value}")


# =============================================================================
# Configuration Models
# =============================================================================

class SecurityConfig(BaseModel):
    """Centralized security configuration with validation."""
    
    # ASVS Configuration
    asvs_level: ASVSLevel = ASVSLevel.LEVEL_2
    asvs_control_mapping_path: Path = Path("docs/security/ASVS.md")
    asvs_evidence_path: Path = Path("docs/compliance/evidence/")
    
    # SAST Configuration
    sast_tools: List[str] = Field(default=["semgrep", "codeql"], min_items=1)
    sast_block_threshold: Severity = Severity.HIGH
    sast_rules_path: Path = Path(".semgrep/rules/")
    
    # DAST Configuration
    dast_tool: str = "owasp_zap"
    dast_schedule_cron: str = "0 2 * * 0"  # Weekly Sunday 02:00 UTC
    dast_artifact_retention_days: int = Field(default=90, ge=30, le=365)
    dast_sla_critical_hours: int = Field(default=48, ge=1, le=168)
    dast_sla_high_hours: int = Field(default=168, ge=1, le=720)  # 7 days
    
    # SCA Configuration
    sca_tools: List[str] = Field(default=["snyk", "dependabot"], min_items=1)
    sca_critical_cvss_threshold: float = Field(default=9.0, ge=0.0, le=10.0)
    sca_high_cvss_threshold: float = Field(default=7.0, ge=0.0, le=10.0)
    sca_critical_patch_days: int = Field(default=7, ge=1, le=30)
    sca_high_patch_days: int = Field(default=30, ge=1, le=90)
    sca_medium_patch_days: int = Field(default=90, ge=1, le=180)
    
    # Secret Scanning Configuration
    secret_scan_tools: List[str] = Field(default=["gitguardian", "github_advanced_security"], min_items=1)
    secret_scan_alert_minutes: int = Field(default=5, ge=1, le=60)
    secret_scan_pre_commit: bool = True
    
    # Penetration Testing Configuration
    pen_test_annual: bool = True
    pen_test_report_delivery_days: int = Field(default=14, ge=1, le=30)
    pen_test_scope: List[str] = Field(
        default=["web_app", "api", "infrastructure"],
        min_items=1
    )
    
    # Bug Bounty Configuration
    bug_bounty_platform: str = "hackerone"
    bug_bounty_disclosure_embargo_days: int = Field(default=90, ge=30, le=180)
    bug_bounty_rewards: Dict[str, Tuple[int, int]] = Field(
        default={
            "critical": (5000, 15000),
            "high": (2000, 5000),
            "medium": (500, 2000),
            "low": (100, 500),
            "informational": (0, 0)
        }
    )
    
    # Related Issues
    related_issues: Dict[str, int] = Field(
        default={
            "ci_cd_hardening": 1011,
            "oss_sbom_tracking": 1054,
            "multi_tenant_isolation": 1065
        }
    )

    class Config:
        """Pydantic model configuration."""
        use_enum_values = True
        validate_assignment = True
        extra = "forbid"

    @validator('sast_tools')
    def validate_sast_tools(cls, v: List[str]) -> List[str]:
        """Validate SAST tool names."""
        valid_tools = {"semgrep", "codeql", "sonarqube", "checkmarx", "veracode"}
        for tool in v:
            if tool.lower() not in valid_tools:
                raise ValueError(f"Invalid SAST tool: {tool}. Must be one of {valid_tools}")
        return [tool.lower() for tool in v]

    @validator('dast_schedule_cron')
    def validate_cron(cls, v: str) -> str:
        """Basic cron expression validation."""
        cron_pattern = r'^(\*|[0-5]?\d)\s(\*|[0-9]|[12][0-9]|3[01])\s(\*|[01]?\d|2[0-3])\s(\*|[01]?\d)\s(\*|[0-6])$'
        if not re.match(cron_pattern, v):
            raise ValueError(f"Invalid cron expression: {v}")
        return v

    @validator('pen_test_scope')
    def validate_pen_test_scope(cls, v: List[str]) -> List[str]:
        """Validate penetration testing scope items."""
        valid_scopes = {"web_app", "api", "infrastructure", "mobile", "cloud"}
        for scope in v:
            if scope.lower() not in valid_scopes:
                raise ValueError(f"Invalid pen test scope: {scope}. Must be one of {valid_scopes}")
        return [scope.lower() for scope in v]

    @root_validator
    def validate_sla_config(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        """Validate SLA configuration consistency."""
        critical_hours = values.get('dast_sla_critical_hours', 48)
        high_hours = values.get('dast_sla_high_hours', 168)
        
        if critical_hours >= high_hours:
            raise ValueError("Critical SLA hours must be less than High SLA hours")
        
        return values

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return self.dict()

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SecurityConfig':
        """Create configuration from dictionary."""
        return cls(**data)

    @classmethod
    def from_yaml(cls, path: Path) -> 'SecurityConfig':
        """Load configuration from YAML file."""
        try:
            with open(path, 'r') as f:
                data = yaml.safe_load(f)
            return cls(**data)
        except FileNotFoundError:
            logger.error(f"Configuration file not found: {path}")
            raise
        except yaml.YAMLError as e:
            logger.error(f"Error parsing YAML configuration: {e}")
            raise
        except ValidationError as e:
            logger.error(f"Configuration validation error: {e}")
            raise


# =============================================================================
# Data Classes for Security Findings
# =============================================================================

@dataclass
class ASVSControl:
    """Represents a single ASVS control requirement."""
    control_id: str
    category: str
    description: str
    level: ASVSLevel
    status: ControlStatus
    rationale: str
    evidence_path: Optional[Path] = None
    remediation_plan: Optional[str] = None
    last_verified: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        """Validate control after initialization."""
        if not self.control_id or not self.control_id.strip():
            raise ValueError("Control ID cannot be empty")
        if not self.category or not self.category.strip():
            raise ValueError("Category cannot be empty")
        if not self.description or not self.description.strip():
            raise ValueError("Description cannot be empty")
        if not self.rationale or not self.rationale.strip():
            raise ValueError("Rationale cannot be empty")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result['level'] = self.level.value
        result['status'] = self.status.value
        result['last_verified'] = self.last_verified.isoformat()
        if self.evidence_path:
            result['evidence_path'] = str(self.evidence_path)
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ASVSControl':
        """Create control from dictionary."""
        data['level'] = ASVSLevel.from_int(data['level'])
        data['status'] = ControlStatus.from_string(data['status'])
        if 'evidence_path' in data and data['evidence_path']:
            data['evidence_path'] = Path(data['evidence_path'])
        if 'last_verified' in data and isinstance(data['last_verified'], str):
            data['last_verified'] = datetime.fromisoformat(data['last_verified'])
        return cls(**data)

    def is_implemented(self) -> bool:
        """Check if control is fully implemented."""
        return self.status == ControlStatus.IMPLEMENTED

    def needs_remediation(self) -> bool:
        """Check if control needs remediation."""
        return self.status == ControlStatus.PARTIAL

    def days_since_verification(self) -> int:
        """Calculate days since last verification."""
        delta = datetime.now(timezone.utc) - self.last_verified
        return delta.days


@dataclass
class SecurityFinding:
    """Represents a security finding from any source."""
    finding_id: str
    source: FindingSource
    severity: Severity
    title: str
    description: str
    affected_component: str
    cvss_score: Optional[float] = None
    cve_id: Optional[str] = None
    discovered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    remediated_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    status: str = "open"
    remediation_plan: Optional[str] = None

    def __post_init__(self) -> None:
        """Validate finding after initialization."""
        if not self.finding_id or not self.finding_id.strip():
            raise ValueError("Finding ID cannot be empty")
        if not self.title or not self.title.strip():
            raise ValueError("Title cannot be empty")
        if not self.description or not self.description.strip():
            raise ValueError("Description cannot be empty")
        if not self.affected_component or not self.affected_component.strip():
            raise ValueError("Affected component cannot be empty")
        
        if self.cvss_score is not None and not (0.0 <= self.cvss_score <= 10.0):
            raise InvalidCVSSError(f"Invalid CVSS score: {self.cvss_score}")
        if self.cve_id and not re.match(r'^CVE-\d{4}-\d{4,}$', self.cve_id):
            raise InvalidCVEFormatError(f"Invalid CVE ID format: {self.cve_id}")
        
        valid_statuses = {"open", "in_progress", "resolved", "false_positive", "accepted_risk"}
        if self.status not in valid_statuses:
            raise ValueError(f"Invalid status: {self.status}. Must be one of {valid_statuses}")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        result = asdict(self)
        result['source'] = self.source.value
        result['severity'] = self.severity.name
        result['discovered_at'] = self.discovered_at.isoformat()
        if self.remediated_at:
            result['remediated_at'] = self.remediated_at.isoformat()
        if self.sla_deadline:
            result['sla_deadline'] = self.sla_deadline.isoformat()
        return result

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SecurityFinding':
        """Create finding from dictionary."""
        data['source'] = FindingSource.from_string(data['source'])
        data['severity'] = Severity.from_string(data['severity'])
        if 'discovered_at' in data and isinstance(data['discovered_at'], str):
            data['discovered_at'] = datetime.fromisoformat(data['discovered_at'])
        if 'remediated_at' in data and isinstance(data['remediated_at'], str):
            data['remediated_at'] = datetime.fromisoformat(data['remediated_at'])
        if 'sla_deadline' in data and isinstance(data['sla_deadline'], str):
            data['sla_deadline'] = datetime.fromisoformat(data['sla_deadline'])
        return cls(**data)

    def calculate_sla_deadline(self, config: SecurityConfig) -> Optional[datetime]:
        """Calculate SLA deadline based on severity and configuration."""
        try:
            if self.severity == Severity.CRITICAL:
                return self.discovered_at + timedelta(hours=config.dast_sla_critical_hours)
            elif self.severity == Severity.HIGH:
                return self.discovered_at + timedelta(hours=config.dast_sla_high_hours)
            return None
        except Exception as e:
            logger.error(f"Error calculating SLA deadline: {e}")
            return None

    def is_overdue(self) -> bool:
        """Check if finding is past its SLA deadline."""
        if self.sla_deadline is None:
            return False
        return datetime.now(timezone.utc) > self.sla_deadline

    def is_critical(self) -> bool:
        """Check if finding is critical severity."""
        return self.severity == Severity.CRITICAL

    def is_high(self) -> bool:
        """Check if finding is high