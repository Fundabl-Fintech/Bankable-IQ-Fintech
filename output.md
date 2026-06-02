"""
Application Security Implementation — OWASP ASVS Level 2
=======================================================

Owner: service:platform
Depends on: [703, 702]
Blocks: []
Spec sections: [10.4]
Blueprint sections: [Blueprint §XII Layer 11 Infrastructure Layer]
Maturity target: lender_ready
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import logging.handlers
import os
import re
import secrets
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Sequence, Set, Tuple, TypeVar, Union, cast
from urllib.parse import urlparse, urlunparse

import requests
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from pydantic import BaseModel, Field, ValidationError, validator, root_validator
from typing_extensions import Final, Literal, TypedDict

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d | %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.handlers.RotatingFileHandler(
            'security_audit.log', maxBytes=10_485_760, backupCount=5
        )
    ]
)
logger = logging.getLogger(__name__)

# Type aliases and constants
SeverityLevel = Literal['critical', 'high', 'medium', 'low']
SecurityFindingID = str
Timestamp = float
CVSSScore = float

SECRET_PATTERNS: Final[Dict[str, re.Pattern]] = {
    'bureau_api_key': re.compile(r'bureau_api_key_[a-f0-9]{32}'),
    'auth0_secret': re.compile(r'auth0_[a-zA-Z0-9_-]{32,64}'),
    'service_token': re.compile(r'svc_token_[a-zA-Z0-9]{40}'),
    'aws_access_key': re.compile(r'AKIA[0-9A-Z]{16}'),
    'github_token': re.compile(r'ghp_[a-zA-Z0-9]{36}'),
}

SLA_TIMES: Final[Dict[SeverityLevel, timedelta]] = {
    'critical': timedelta(hours=24),
    'high': timedelta(days=7),
    'medium': timedelta(days=30),
    'low': timedelta(days=90),
}

TRIAGE_SLA: Final[Dict[SeverityLevel, timedelta]] = {
    'critical': timedelta(hours=4),
    'high': timedelta(hours=24),
    'medium': timedelta(hours=48),
    'low': timedelta(days=7),
}

# Custom exceptions
class SecurityException(Exception):
    """Base exception for security-related errors."""
    pass

class InvalidSeverityError(SecurityException):
    """Raised when an invalid severity level is provided."""
    pass

class SLAExceededError(SecurityException):
    """Raised when a security finding exceeds its SLA."""
    pass

class SecretScanningError(SecurityException):
    """Raised when secret scanning encounters an error."""
    pass

class DASTScanError(SecurityException):
    """Raised when DAST scanning fails."""
    pass

class VulnerabilityNotFoundError(SecurityException):
    """Raised when a vulnerability is not found."""
    pass

class InvalidConfigurationError(SecurityException):
    """Raised when configuration is invalid."""
    pass

class InputValidationError(SecurityException):
    """Raised when input validation fails."""
    pass

class RateLimitExceededError(SecurityException):
    """Raised when rate limit is exceeded."""
    pass

# Enums
class ASVSLevel(Enum):
    """OWASP ASVS verification levels."""
    LEVEL_1 = 1
    LEVEL_2 = 2
    LEVEL_3 = 3

class FindingSource(Enum):
    """Source of security finding."""
    DAST = auto()
    SAST = auto()
    PENETRATION_TEST = auto()
    BUG_BOUNTY = auto()
    INTERNAL_DISCOVERY = auto()
    SECRET_SCANNING = auto()
    DEPENDENCY_SCAN = auto()

class FindingStatus(Enum):
    """Status of a security finding."""
    OPEN = auto()
    IN_TRIAGE = auto()
    IN_PROGRESS = auto()
    FIXED = auto()
    ACCEPTED = auto()
    CLOSED = auto()

# Data models
@dataclass(frozen=True)
class SecurityFinding:
    """Immutable security finding data model."""
    id: SecurityFindingID
    title: str
    description: str
    severity: SeverityLevel
    cvss_score: CVSSScore
    source: FindingSource
    status: FindingStatus
    created_at: Timestamp
    updated_at: Timestamp
    sla_deadline: Timestamp
    triage_deadline: Timestamp
    affected_services: List[str] = field(default_factory=list)
    remediation_steps: List[str] = field(default_factory=list)
    references: List[str] = field(default_factory=list)
    assigned_to: Optional[str] = None

    def __post_init__(self) -> None:
        """Validate finding after initialization."""
        if self.severity not in SLA_TIMES:
            raise InvalidSeverityError(f"Invalid severity: {self.severity}")
        if self.cvss_score < 0.0 or self.cvss_score > 10.0:
            raise ValueError(f"Invalid CVSS score: {self.cvss_score}")

    def is_sla_exceeded(self) -> bool:
        """Check if SLA has been exceeded."""
        return time.time() > self.sla_deadline

    def is_triage_sla_exceeded(self) -> bool:
        """Check if triage SLA has been exceeded."""
        return time.time() > self.triage_deadline

@dataclass
class DASTScanResult:
    """DAST scan result data model."""
    scan_id: str
    timestamp: Timestamp
    target_url: str
    findings: List[SecurityFinding]
    scan_duration_seconds: float
    is_complete: bool
    error_message: Optional[str] = None

    def has_critical_or_high_findings(self) -> bool:
        """Check if scan has critical or high severity findings."""
        return any(
            finding.severity in ('critical', 'high')
            for finding in self.findings
        )

@dataclass
class SecretScanResult:
    """Secret scanning result data model."""
    repo_name: str
    branch: str
    commit_hash: str
    secrets_found: List[Dict[str, Any]]
    scan_timestamp: Timestamp
    is_blocked: bool

# Protocols and interfaces
class SecurityScanner(Protocol):
    """Protocol for security scanners."""
    def scan(self, target: str) -> DASTScanResult:
        """Perform security scan on target."""
        ...

class SecretDetector(Protocol):
    """Protocol for secret detection."""
    def detect_secrets(self, content: str) -> List[Dict[str, Any]]:
        """Detect secrets in content."""
        ...

class VulnerabilityRepository(Protocol):
    """Protocol for vulnerability storage."""
    def add_finding(self, finding: SecurityFinding) -> None:
        """Add a security finding."""
        ...
    
    def get_finding(self, finding_id: SecurityFindingID) -> Optional[SecurityFinding]:
        """Get a security finding by ID."""
        ...
    
    def update_finding(self, finding: SecurityFinding) -> None:
        """Update a security finding."""
        ...
    
    def get_overdue_findings(self) -> List[SecurityFinding]:
        """Get findings that have exceeded their SLA."""
        ...

# Concrete implementations
class OWASPZAPScanner:
    """OWASP ZAP DAST scanner implementation."""
    
    def __init__(self, api_key: str, zap_url: str = "http://localhost:8080") -> None:
        """Initialize ZAP scanner.
        
        Args:
            api_key: ZAP API key
            zap_url: ZAP daemon URL
            
        Raises:
            InvalidConfigurationError: If configuration is invalid
        """
        if not api_key:
            raise InvalidConfigurationError("ZAP API key is required")
        if not zap_url:
            raise InvalidConfigurationError("ZAP URL is required")
            
        self.api_key = api_key
        self.zap_url = zap_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'X-ZAP-API-Key': api_key,
            'Content-Type': 'application/json'
        })
        logger.info(f"Initialized ZAP scanner at {zap_url}")
    
    def scan(self, target: str) -> DASTScanResult:
        """Perform DAST scan using OWASP ZAP.
        
        Args:
            target: URL to scan
            
        Returns:
            DASTScanResult containing scan findings
            
        Raises:
            DASTScanError: If scan fails
            InputValidationError: If target URL is invalid
        """
        # Input validation
        if not target or not isinstance(target, str):
            raise InputValidationError("Target URL must be a non-empty string")
        
        try:
            parsed_url = urlparse(target)
            if not parsed_url.scheme or not parsed_url.netloc:
                raise InputValidationError(f"Invalid target URL: {target}")
        except Exception as e:
            raise InputValidationError(f"URL parsing failed: {str(e)}")
        
        scan_id = f"zap_{int(time.time())}_{secrets.token_hex(8)}"
        start_time = time.time()
        
        try:
            # Start spider scan
            spider_response = self.session.get(
                f"{self.zap_url}/JSON/spider/action/scan/",
                params={"url": target, "maxChildren": 10, "recurse": True}
            )
            spider_response.raise_for_status()
            spider_data = spider_response.json()
            
            if "scan" not in spider_data:
                raise DASTScanError("Failed to start spider scan")
            
            spider_id = spider_data["scan"]
            
            # Wait for spider to complete
            self._wait_for_spider_completion(spider_id)
            
            # Start active scan
            active_response = self.session.get(
                f"{self.zap_url}/JSON/ascan/action/scan/",
                params={"url": target, "recurse": True, "inScopeOnly": True}
            )
            active_response.raise_for_status()
            active_data = active_response.json()
            
            if "scan" not in active_data:
                raise DASTScanError("Failed to start active scan")
            
            active_scan_id = active_data["scan"]
            
            # Wait for active scan to complete
            self._wait_for_active_scan_completion(active_scan_id)
            
            # Get alerts
            alerts_response = self.session.get(
                f"{self.zap_url}/JSON/core/view/alerts/",
                params={"baseurl": target, "start": 0, "count": 1000}
            )
            alerts_response.raise_for_status()
            alerts_data = alerts_response.json()
            
            # Process findings
            findings = self._process_alerts(alerts_data.get("alerts", []))
            
            scan_duration = time.time() - start_time
            
            logger.info(
                f"ZAP scan completed: scan_id={scan_id}, "
                f"duration={scan_duration:.2f}s, "
                f"findings={len(findings)}"
            )
            
            return DASTScanResult(
                scan_id=scan_id,
                timestamp=time.time(),
                target_url=target,
                findings=findings,
                scan_duration_seconds=scan_duration,
                is_complete=True
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"ZAP scan request failed: {str(e)}")
            raise DASTScanError(f"ZAP scan request failed: {str(e)}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ZAP response: {str(e)}")
            raise DASTScanError(f"Failed to parse ZAP response: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error during ZAP scan: {str(e)}")
            raise DASTScanError(f"Unexpected error during ZAP scan: {str(e)}")
    
    def _wait_for_spider_completion(self, spider_id: str, timeout: int = 600) -> None:
        """Wait for spider scan to complete.
        
        Args:
            spider_id: Spider scan ID
            timeout: Maximum wait time in seconds
            
        Raises:
            DASTScanError: If spider scan fails or times out
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = self.session.get(
                    f"{self.zap_url}/JSON/spider/view/status/",
                    params={"scanId": spider_id}
                )
                response.raise_for_status()
                status_data = response.json()
                
                if "status" in status_data and int(status_data["status"]) >= 100:
                    logger.info(f"Spider scan {spider_id} completed")
                    return
                    
                time.sleep(2)
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"Error checking spider status: {str(e)}")
                time.sleep(5)
        
        raise DASTScanError(f"Spider scan {spider_id} timed out after {timeout}s")
    
    def _wait_for_active_scan_completion(self, scan_id: str, timeout: int = 1800) -> None:
        """Wait for active scan to complete.
        
        Args:
            scan_id: Active scan ID
            timeout: Maximum wait time in seconds
            
        Raises:
            DASTScanError: If active scan fails or times out
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                response = self.session.get(
                    f"{self.zap_url}/JSON/ascan/view/status/",
                    params={"scanId": scan_id}
                )
                response.raise_for_status()
                status_data = response.json()
                
                if "status" in status_data and int(status_data["status"]) >= 100:
                    logger.info(f"Active scan {scan_id} completed")
                    return
                    
                time.sleep(5)
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"Error checking active scan status: {str(e)}")
                time.sleep(10)
        
        raise DASTScanError(f"Active scan {scan_id} timed out after {timeout}s")
    
    def _process_alerts(self, alerts: List[Dict[str, Any]]) -> List[SecurityFinding]:
        """Process ZAP alerts into SecurityFinding objects.
        
        Args:
            alerts: List of ZAP alert dictionaries
            
        Returns:
            List of SecurityFinding objects
        """
        findings: List[SecurityFinding] = []
        
        for alert in alerts:
            try:
                risk = alert.get("risk", "Low").lower()
                confidence = alert.get("confidence", "Medium")
                
                # Map ZAP risk to severity
                severity_map = {
                    "high": "high",
                    "medium": "medium",
                    "low": "low",
                    "informational": "low"
                }
                severity = severity_map.get(risk, "low")
                
                # Calculate CVSS score based on risk and confidence
                cvss_score = self._calculate_cvss_score(risk, confidence)
                
                # Calculate SLA deadlines
                sla_deadline = time.time() + SLA_TIMES[severity].total_seconds()
                triage_deadline = time.time() + TRIAGE_SLA[severity].total_seconds()
                
                finding = SecurityFinding(
                    id=f"ZAP-{secrets.token_hex(8)}",
                    title=alert.get("name", "Unknown vulnerability"),
                    description=alert.get("description", "No description provided"),
                    severity=severity,
                    cvss_score=cvss_score,
                    source=FindingSource.DAST,
                    status=FindingStatus.OPEN,
                    created_at=time.time(),
                    updated_at=time.time(),
                    sla_deadline=sla_deadline,
                    triage_deadline=triage_deadline,
                    affected_services=[self._extract_service_name(alert.get("url", ""))],
                    remediation_steps=self._extract_remediation(alert),
                    references=[alert.get("reference", "")] if alert.get("reference") else []
                )
                
                findings.append(finding)
                
            except Exception as e:
                logger.warning(f"Failed to process alert: {str(e)}")
                continue
        
        return findings
    
    def _calculate_cvss_score(self, risk: str, confidence: str) -> float:
        """Calculate approximate CVSS score from ZAP risk and confidence.
        
        Args:
            risk: ZAP risk level
            confidence: ZAP confidence level
            
        Returns:
            Approximate CVSS score
        """
        risk_scores = {"high": 8.0, "medium": 5.0, "low": 2.0, "informational": 0.5}
        confidence_modifiers = {"High": 1.0, "Medium": 0.8, "Low": 0.5}
        
        base_score = risk_scores.get(risk.lower(), 2.0)
        modifier = confidence_modifiers.get(confidence, 0.8)
        
        return min(base_score * modifier, 10.0)
    
    def _extract_service_name(self, url: str) -> str:
        """Extract service name from URL.
        
        Args:
            url: Target URL
            
        Returns:
            Service name
        """
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or "unknown"
            return hostname.split(".")[0] if "." in hostname else hostname
        except Exception:
            return "unknown"
    
    def _extract_remediation(self, alert: Dict[str, Any]) -> List[str]:
        """Extract remediation steps from alert.
        
        Args:
            alert: ZAP alert dictionary
            
        Returns:
            List of remediation steps
        """