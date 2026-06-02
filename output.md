"""
Application Security Practices Implementation — OWASP ASVS
===========================================================

Owner: service:compliance
Spec Reference: §10.4
Maturity Target: lender_ready

This module implements the security controls and compliance verification
for the BANKABLE IQ platform as defined in OWASP ASVS v4.0.
"""

from __future__ import annotations

import enum
import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Sequence, Tuple, Union

import yaml
from pydantic import BaseModel, Field, ValidationError, validator

# Configure module logger
logger = logging.getLogger(__name__)


# =============================================================================
# Type Definitions and Protocols
# =============================================================================

class SecurityControl(Protocol):
    """Protocol defining the interface for security controls."""
    
    def verify(self) -> bool:
        """Verify the control is properly implemented."""
        ...
    
    def get_status(self) -> str:
        """Get the current implementation status."""
        ...


class VulnerabilityReport(Protocol):
    """Protocol for vulnerability report structures."""
    
    severity: str
    description: str
    remediation: Optional[str]


# =============================================================================
# Enumerations
# =============================================================================

class ImplementationStatus(str, enum.Enum):
    """ASVS control implementation status."""
    
    IMPLEMENTED = "implemented"
    PARTIAL = "partial"
    NOT_APPLICABLE = "not_applicable"
    
    @classmethod
    def from_string(cls, value: str) -> "ImplementationStatus":
        """Create status from string with validation."""
        try:
            return cls(value.lower())
        except ValueError:
            logger.error(f"Invalid implementation status: {value}")
            raise ValueError(f"Invalid status: {value}. Must be one of {list(cls)}")


class SeverityLevel(str, enum.Enum):
    """Security finding severity levels."""
    
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"
    
    @property
    def numeric_value(self) -> int:
        """Get numeric value for comparison."""
        mapping = {
            self.CRITICAL: 5,
            self.HIGH: 4,
            self.MEDIUM: 3,
            self.LOW: 2,
            self.INFORMATIONAL: 1,
        }
        return mapping[self]
    
    def __ge__(self, other: "SeverityLevel") -> bool:
        """Enable severity comparison."""
        return self.numeric_value >= other.numeric_value


class ASVSCategory(str, enum.Enum):
    """OWASP ASVS control categories."""
    
    V2_AUTHENTICATION = "V2 Authentication"
    V3_SESSION = "V3 Session Management"
    V8_DATA_PROTECTION = "V8 Data Protection"
    V9_COMMUNICATION = "V9 Communication"


# =============================================================================
# Data Models
# =============================================================================

@dataclass
class ASVSControl:
    """Represents a single ASVS control requirement."""
    
    control_id: str
    category: ASVSCategory
    description: str
    level: int  # 1, 2, or 3
    status: ImplementationStatus
    rationale: Optional[str] = None
    remediation_plan: Optional[str] = None
    verified_date: Optional[datetime] = None
    verified_by: Optional[str] = None
    
    def __post_init__(self) -> None:
        """Validate control data after initialization."""
        if self.level not in {1, 2, 3}:
            raise ValueError(f"Invalid ASVS level: {self.level}")
        
        if self.status == ImplementationStatus.PARTIAL and not self.remediation_plan:
            logger.warning(f"Control {self.control_id} marked as partial without remediation plan")
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize control to dictionary."""
        return {
            "control_id": self.control_id,
            "category": self.category.value,
            "description": self.description,
            "level": self.level,
            "status": self.status.value,
            "rationale": self.rationale,
            "remediation_plan": self.remediation_plan,
            "verified_date": self.verified_date.isoformat() if self.verified_date else None,
            "verified_by": self.verified_by,
        }


class SecurityFinding(BaseModel):
    """Security finding from SAST/DAST/SCA scanning."""
    
    id: str = Field(..., description="Unique finding identifier")
    tool: str = Field(..., description="Source tool (e.g., Semgrep, ZAP, Snyk)")
    severity: SeverityLevel
    description: str = Field(..., min_length=10, max_length=5000)
    location: Optional[str] = Field(None, description="File path or endpoint")
    cve_id: Optional[str] = Field(None, pattern=r"^CVE-\d{4}-\d{4,}$")
    cvss_score: Optional[float] = Field(None, ge=0.0, le=10.0)
    remediation: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field(default="open", pattern=r"^(open|in_progress|resolved|false_positive)$")
    
    @validator("cvss_score")
    def validate_cvss(cls, value: Optional[float]) -> Optional[float]:
        """Validate CVSS score range."""
        if value is not None and not (0.0 <= value <= 10.0):
            raise ValueError(f"CVSS score must be between 0.0 and 10.0, got {value}")
        return value
    
    @validator("severity", pre=True)
    def validate_severity(cls, value: str) -> SeverityLevel:
        """Validate and convert severity string."""
        return SeverityLevel.from_string(value) if isinstance(value, str) else value


class ComplianceReport(BaseModel):
    """Quarterly compliance verification report."""
    
    quarter: str = Field(..., pattern=r"^\d{4}-Q[1-4]$")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    verified_by: str
    controls_verified: int = Field(..., ge=0)
    controls_passed: int = Field(..., ge=0)
    controls_failed: int = Field(..., ge=0)
    findings: List[SecurityFinding] = Field(default_factory=list)
    evidence_path: Optional[Path] = None
    
    @validator("controls_verified")
    def validate_counts(cls, value: int, values: Dict[str, Any]) -> int:
        """Validate control counts are consistent."""
        if "controls_passed" in values and "controls_failed" in values:
            total = values["controls_passed"] + values["controls_failed"]
            if total > value:
                raise ValueError(
                    f"Sum of passed ({values['controls_passed']}) and failed "
                    f"({values['controls_failed']}) exceeds verified ({value})"
                )
        return value
    
    @property
    def pass_rate(self) -> float:
        """Calculate pass rate percentage."""
        if self.controls_verified == 0:
            return 0.0
        return (self.controls_passed / self.controls_verified) * 100


# =============================================================================
# Security Scanner Implementations
# =============================================================================

class SASTScanner:
    """Static Application Security Testing implementation."""
    
    def __init__(
        self,
        semgrep_rules_dir: Path = Path(".semgrep"),
        codeql_enabled: bool = True,
        blocking_severities: Tuple[SeverityLevel, ...] = (
            SeverityLevel.HIGH,
            SeverityLevel.CRITICAL,
        ),
    ) -> None:
        """Initialize SAST scanner with configuration."""
        self.semgrep_rules_dir = semgrep_rules_dir
        self.codeql_enabled = codeql_enabled
        self.blocking_severities = blocking_severities
        self._findings: List[SecurityFinding] = []
        self._logger = logging.getLogger(f"{__name__}.SASTScanner")
        
        # Validate configuration
        if not semgrep_rules_dir.exists():
            self._logger.warning(f"Semgrep rules directory not found: {semgrep_rules_dir}")
    
    def scan(self, target_path: Path) -> List[SecurityFinding]:
        """Execute SAST scan on target path.
        
        Args:
            target_path: Path to scan
            
        Returns:
            List of security findings
            
        Raises:
            FileNotFoundError: If target path doesn't exist
            PermissionError: If insufficient permissions
        """
        if not target_path.exists():
            raise FileNotFoundError(f"Target path not found: {target_path}")
        
        if not os.access(target_path, os.R_OK):
            raise PermissionError(f"Insufficient permissions to read: {target_path}")
        
        self._findings = []
        
        try:
            # Semgrep scan
            self._run_semgrep(target_path)
            
            # CodeQL scan if enabled
            if self.codeql_enabled:
                self._run_codeql(target_path)
                
        except Exception as e:
            self._logger.error(f"SAST scan failed: {e}", exc_info=True)
            raise
        
        return self._findings
    
    def _run_semgrep(self, target_path: Path) -> None:
        """Execute Semgrep scan."""
        try:
            # Simulated Semgrep execution
            self._logger.info(f"Running Semgrep on {target_path}")
            
            # In production, this would execute: subprocess.run(["semgrep", "--config", str(self.semgrep_rules_dir), str(target_path)])
            
            finding = SecurityFinding(
                id=f"SEMGREP-{datetime.utcnow().timestamp()}",
                tool="Semgrep",
                severity=SeverityLevel.MEDIUM,
                description="Sample Semgrep finding for demonstration",
                location=str(target_path),
                remediation="Review and fix the identified pattern",
            )
            self._findings.append(finding)
            
        except Exception as e:
            self._logger.error(f"Semgrep execution failed: {e}")
            raise
    
    def _run_codeql(self, target_path: Path) -> None:
        """Execute CodeQL scan."""
        try:
            self._logger.info(f"Running CodeQL on {target_path}")
            
            # In production, this would execute CodeQL CLI commands
            
        except Exception as e:
            self._logger.error(f"CodeQL execution failed: {e}")
            raise
    
    def get_blocking_findings(self) -> List[SecurityFinding]:
        """Get findings that should block merge."""
        return [
            finding for finding in self._findings
            if finding.severity in self.blocking_severities
        ]


class DASTScanner:
    """Dynamic Application Security Testing implementation."""
    
    def __init__(
        self,
        target_url: str,
        zap_api_key: Optional[str] = None,
        scan_policy: str = "Default Policy",
    ) -> None:
        """Initialize DAST scanner.
        
        Args:
            target_url: Target application URL
            zap_api_key: OWASP ZAP API key
            scan_policy: ZAP scan policy name
        """
        self.target_url = target_url
        self.zap_api_key = zap_api_key or os.getenv("ZAP_API_KEY")
        self.scan_policy = scan_policy
        self._findings: List[SecurityFinding] = []
        self._logger = logging.getLogger(f"{__name__}.DASTScanner")
        
        # Validate URL
        if not target_url.startswith(("http://", "https://")):
            raise ValueError(f"Invalid target URL: {target_url}")
    
    def run_scan(self) -> List[SecurityFinding]:
        """Execute DAST scan against target.
        
        Returns:
            List of security findings
            
        Raises:
            ConnectionError: If target is unreachable
            TimeoutError: If scan times out
        """
        self._findings = []
        
        try:
            self._logger.info(f"Starting DAST scan against {self.target_url}")
            
            # Simulated ZAP scan
            # In production: subprocess.run(["zap-cli", "quick-scan", self.target_url])
            
            finding = SecurityFinding(
                id=f"ZAP-{datetime.utcnow().timestamp()}",
                tool="OWASP ZAP",
                severity=SeverityLevel.HIGH,
                description="Sample DAST finding for demonstration",
                location=self.target_url,
                remediation="Review and fix the identified vulnerability",
            )
            self._findings.append(finding)
            
        except Exception as e:
            self._logger.error(f"DAST scan failed: {e}", exc_info=True)
            raise
        
        return self._findings
    
    def generate_report(self, output_path: Path) -> None:
        """Generate ZAP scan report.
        
        Args:
            output_path: Path to save the report
        """
        try:
            report = {
                "scan_target": self.target_url,
                "scan_date": datetime.utcnow().isoformat(),
                "findings": [finding.dict() for finding in self._findings],
                "summary": {
                    "total": len(self._findings),
                    "critical": sum(1 for f in self._findings if f.severity == SeverityLevel.CRITICAL),
                    "high": sum(1 for f in self._findings if f.severity == SeverityLevel.HIGH),
                    "medium": sum(1 for f in self._findings if f.severity == SeverityLevel.MEDIUM),
                    "low": sum(1 for f in self._findings if f.severity == SeverityLevel.LOW),
                }
            }
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                json.dump(report, f, indent=2)
                
            self._logger.info(f"ZAP report generated: {output_path}")
            
        except Exception as e:
            self._logger.error(f"Failed to generate ZAP report: {e}")
            raise


class SCAScanner:
    """Software Composition Analysis implementation."""
    
    def __init__(
        self,
        snyk_token: Optional[str] = None,
        critical_cvss_threshold: float = 7.0,
        patch_deadline_days: int = 7,
    ) -> None:
        """Initialize SCA scanner.
        
        Args:
            snyk_token: Snyk API token
            critical_cvss_threshold: CVSS score threshold for auto-advisory
            patch_deadline_days: Days to patch critical CVEs
        """
        self.snyk_token = snyk_token or os.getenv("SNYK_TOKEN")
        self.critical_cvss_threshold = critical_cvss_threshold
        self.patch_deadline_days = patch_deadline_days
        self._findings: List[SecurityFinding] = []
        self._logger = logging.getLogger(f"{__name__}.SCAScanner")
        
        # Validate threshold
        if not 0.0 <= critical_cvss_threshold <= 10.0:
            raise ValueError(f"Invalid CVSS threshold: {critical_cvss_threshold}")
    
    def scan_dependencies(self, project_path: Path) -> List[SecurityFinding]:
        """Scan project dependencies for vulnerabilities.
        
        Args:
            project_path: Path to project directory
            
        Returns:
            List of security findings
            
        Raises:
            FileNotFoundError: If project path doesn't exist
        """
        if not project_path.exists():
            raise FileNotFoundError(f"Project path not found: {project_path}")
        
        self._findings = []
        
        try:
            self._logger.info(f"Scanning dependencies in {project_path}")
            
            # Simulated Snyk scan
            # In production: subprocess.run(["snyk", "test", "--json"])
            
            # Check for critical CVEs
            critical_finding = SecurityFinding(
                id=f"SNYK-{datetime.utcnow().timestamp()}",
                tool="Snyk",
                severity=SeverityLevel.CRITICAL,
                description="Sample critical vulnerability for demonstration",
                location=str(project_path / "requirements.txt"),
                cve_id="CVE-2024-1234",
                cvss_score=9.8,
                remediation="Update dependency to patched version",
            )
            
            if critical_finding.cvss_score and critical_finding.cvss_score >= self.critical_cvss_threshold:
                self._create_security_advisory(critical_finding)
            
            self._findings.append(critical_finding)
            
        except Exception as e:
            self._logger.error(f"SCA scan failed: {e}", exc_info=True)
            raise
        
        return self._findings
    
    def _create_security_advisory(self, finding: SecurityFinding) -> None:
        """Create security advisory for critical findings.
        
        Args:
            finding: Critical security finding
        """
        try:
            advisory = {
                "title": f"Critical CVE: {finding.cve_id}",
                "description": finding.description,
                "severity": finding.severity.value,
                "cvss_score": finding.cvss_score,
                "patch_deadline": (datetime.utcnow() + timedelta(days=self.patch_deadline_days)).isoformat(),
                "finding_id": finding.id,
            }
            
            # In production, this would create a GitHub issue
            self._logger.warning(
                f"Security advisory created for {finding.cve_id}: "
                f"Patch required within {self.patch_deadline_days} days"
            )
            
        except Exception as e:
            self._logger.error(f"Failed to create security advisory: {e}")
            raise


class SecretScanner:
    """Secret scanning implementation."""
    
    def __init__(
        self,
        gitguardian_token: Optional[str] = None,
        enable_push_protection: bool = True,
    ) -> None:
        """Initialize secret scanner.
        
        Args:
            gitguardian_token: GitGuardian API token
            enable_push_protection: Enable push protection
        """
        self.gitguardian_token = gitguardian_token or os.getenv("GITGUARDIAN_TOKEN")
        self.enable_push_protection = enable_push_protection
        self._logger = logging.getLogger(f"{__name__}.SecretScanner")
    
    def