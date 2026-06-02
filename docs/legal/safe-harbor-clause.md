"""
Safe Harbor Clause Module for Bug Bounty Program
=================================================

This module implements the Safe Harbor Clause for the GetBankable Bug Bounty Program,
providing legal protections and boundaries for security researchers participating in
good faith. It integrates with the compliance service and supports Phase 3 public
marketplace launch requirements.

Owner: service:compliance
Depends on: §10.4, §11.2, §16.3
Blocks: §16.3 Phase 3 public marketplace launch
Maturity target: compounding_capital
"""

from __future__ import annotations

import enum
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Union, final

# Configure module logger
logger = logging.getLogger(__name__)


class SeverityLevel(enum.Enum):
    """Severity classification for vulnerability findings."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"

    @property
    def remediation_days(self) -> int:
        """Get remediation timeline in calendar days."""
        remediation_map = {
            SeverityLevel.CRITICAL: 7,
            SeverityLevel.HIGH: 14,
            SeverityLevel.MEDIUM: 30,
            SeverityLevel.LOW: 90,
            SeverityLevel.INFORMATIONAL: 120,
        }
        return remediation_map[self]

    @classmethod
    def from_string(cls, value: str) -> "SeverityLevel":
        """Create severity level from string with validation."""
        try:
            return cls(value.lower())
        except ValueError:
            logger.error(f"Invalid severity level: {value}")
            raise ValueError(f"Invalid severity level: {value}. Must be one of {[e.value for e in cls]}")


class ResearcherStatus(enum.Enum):
    """Status of a security researcher in the program."""
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    PENDING_REVIEW = "pending_review"


@dataclass(frozen=True)
class RemediationTimeline:
    """Immutable remediation timeline configuration."""
    acknowledgement_hours: int = 24
    triage_hours: int = 72
    minimum_disclosure_days: int = 30

    def __post_init__(self) -> None:
        """Validate timeline parameters."""
        if self.acknowledgement_hours <= 0:
            raise ValueError("Acknowledgement hours must be positive")
        if self.triage_hours <= 0:
            raise ValueError("Triage hours must be positive")
        if self.minimum_disclosure_days < 0:
            raise ValueError("Minimum disclosure days cannot be negative")


@dataclass
class VulnerabilityReport:
    """Represents a vulnerability report submitted by a researcher."""
    report_id: str
    researcher_id: str
    severity: SeverityLevel
    description: str
    submission_timestamp: datetime
    acknowledgement_timestamp: Optional[datetime] = None
    triage_timestamp: Optional[datetime] = None
    remediation_timestamp: Optional[datetime] = None
    is_remediated: bool = False
    notes: List[str] = field(default_factory=list)

    def acknowledge(self) -> None:
        """Mark report as acknowledged."""
        self.acknowledgement_timestamp = datetime.utcnow()
        logger.info(f"Report {self.report_id} acknowledged by researcher {self.researcher_id}")

    def triage(self) -> None:
        """Mark report as triaged."""
        self.triage_timestamp = datetime.utcnow()
        logger.info(f"Report {self.report_id} triaged with severity {self.severity.value}")

    def remediate(self) -> None:
        """Mark report as remediated."""
        self.remediation_timestamp = datetime.utcnow()
        self.is_remediated = True
        logger.info(f"Report {self.report_id} remediated")


@final
class Safe HarborClause:
    """
    Safe Harbor Clause implementation for Bug Bounty Program.
    
    Provides legal protections and boundaries for security researchers
    who participate in the program in good faith. This class is final
    and should not be subclassed.
    """

    def __init__(
        self,
        program_name: str = "GetBankable Bug Bounty Program",
        version: str = "1.0",
        effective_date: Optional[datetime] = None,
        scope_url: str = "https://security.getbankable.io/bug-bounty/scope",
        disclosure_policy_url: str = "https://security.getbankable.io/responsible-disclosure",
        remediation_timeline: Optional[RemediationTimeline] = None,
    ) -> None:
        """
        Initialize Safe Harbor Clause.

        Args:
            program_name: Name of the bug bounty program
            version: Version of the safe harbor clause
            effective_date: Effective date (defaults to current UTC time)
            scope_url: URL for in-scope systems documentation
            disclosure_policy_url: URL for responsible disclosure policy
            remediation_timeline: Custom remediation timeline configuration

        Raises:
            ValueError: If any parameter validation fails
        """
        if not program_name or not program_name.strip():
            raise ValueError("Program name cannot be empty")
        if not version:
            raise ValueError("Version cannot be empty")
        if not scope_url or not scope_url.startswith(("http://", "https://")):
            raise ValueError("Scope URL must be a valid HTTP/HTTPS URL")
        if not disclosure_policy_url or not disclosure_policy_url.startswith(("http://", "https://")):
            raise ValueError("Disclosure policy URL must be a valid HTTP/HTTPS URL")

        self._program_name: str = program_name.strip()
        self._version: str = version
        self._effective_date: datetime = effective_date or datetime.utcnow()
        self._scope_url: str = scope_url
        self._disclosure_policy_url: str = disclosure_policy_url
        self._remediation_timeline: RemediationTimeline = remediation_timeline or RemediationTimeline()
        
        # Internal state
        self._active_researchers: Dict[str, ResearcherStatus] = {}
        self._reports: Dict[str, VulnerabilityReport] = {}
        self._in_scope_systems: Set[str] = set()
        self._out_of_scope_systems: Set[str] = set()
        self._prohibited_methods: Set[str] = {
            "denial_of_service",
            "social_engineering",
            "physical_security_testing",
            "illegal_activities",
            "customer_privacy_violation",
        }
        
        logger.info(
            f"Safe Harbor Clause initialized: {self._program_name} v{self._version}, "
            f"effective {self._effective_date.isoformat()}"
        )

    @property
    def program_name(self) -> str:
        """Get the program name."""
        return self._program_name

    @property
    def version(self) -> str:
        """Get the version."""
        return self._version

    @property
    def effective_date(self) -> datetime:
        """Get the effective date."""
        return self._effective_date

    @property
    def scope_url(self) -> str:
        """Get the scope URL."""
        return self._scope_url

    @property
    def disclosure_policy_url(self) -> str:
        """Get the disclosure policy URL."""
        return self._disclosure_policy_url

    def register_researcher(self, researcher_id: str) -> bool:
        """
        Register a researcher for the bug bounty program.

        Args:
            researcher_id: Unique identifier for the researcher

        Returns:
            True if registration was successful, False if already registered

        Raises:
            ValueError: If researcher_id is invalid
        """
        if not researcher_id or not researcher_id.strip():
            raise ValueError("Researcher ID cannot be empty")

        if researcher_id in self._active_researchers:
            logger.warning(f"Researcher {researcher_id} already registered")
            return False

        self._active_researchers[researcher_id] = ResearcherStatus.ACTIVE
        logger.info(f"Researcher {researcher_id} registered successfully")
        return True

    def suspend_researcher(self, researcher_id: str) -> bool:
        """
        Suspend a researcher from the bug bounty program.

        Args:
            researcher_id: Unique identifier for the researcher

        Returns:
            True if suspension was successful, False if researcher not found

        Raises:
            ValueError: If researcher_id is invalid
        """
        if not researcher_id or not researcher_id.strip():
            raise ValueError("Researcher ID cannot be empty")

        if researcher_id not in self._active_researchers:
            logger.warning(f"Researcher {researcher_id} not found")
            return False

        self._active_researchers[researcher_id] = ResearcherStatus.SUSPENDED
        logger.info(f"Researcher {researcher_id} suspended")
        return True

    def terminate_researcher(self, researcher_id: str) -> bool:
        """
        Terminate a researcher from the bug bounty program.

        Args:
            researcher_id: Unique identifier for the researcher

        Returns:
            True if termination was successful, False if researcher not found

        Raises:
            ValueError: If researcher_id is invalid
        """
        if not researcher_id or not researcher_id.strip():
            raise ValueError("Researcher ID cannot be empty")

        if researcher_id not in self._active_researchers:
            logger.warning(f"Researcher {researcher_id} not found")
            return False

        self._active_researchers[researcher_id] = ResearcherStatus.TERMINATED
        logger.info(f"Researcher {researcher_id} terminated")
        return True

    def get_researcher_status(self, researcher_id: str) -> Optional[ResearcherStatus]:
        """
        Get the status of a researcher.

        Args:
            researcher_id: Unique identifier for the researcher

        Returns:
            Researcher status if found, None otherwise

        Raises:
            ValueError: If researcher_id is invalid
        """
        if not researcher_id or not researcher_id.strip():
            raise ValueError("Researcher ID cannot be empty")

        return self._active_researchers.get(researcher_id)

    def submit_report(
        self,
        report_id: str,
        researcher_id: str,
        severity: SeverityLevel,
        description: str,
    ) -> bool:
        """
        Submit a vulnerability report.

        Args:
            report_id: Unique identifier for the report
            researcher_id: Unique identifier for the researcher
            severity: Severity level of the vulnerability
            description: Description of the vulnerability

        Returns:
            True if submission was successful, False if report already exists

        Raises:
            ValueError: If any parameter is invalid
            PermissionError: If researcher is not active
        """
        if not report_id or not report_id.strip():
            raise ValueError("Report ID cannot be empty")
        if not researcher_id or not researcher_id.strip():
            raise ValueError("Researcher ID cannot be empty")
        if not description or not description.strip():
            raise ValueError("Description cannot be empty")

        if report_id in self._reports:
            logger.warning(f"Report {report_id} already exists")
            return False

        researcher_status = self._active_researchers.get(researcher_id)
        if researcher_status != ResearcherStatus.ACTIVE:
            logger.error(f"Researcher {researcher_id} is not active (status: {researcher_status})")
            raise PermissionError(f"Researcher {researcher_id} is not authorized to submit reports")

        report = VulnerabilityReport(
            report_id=report_id,
            researcher_id=researcher_id,
            severity=severity,
            description=description,
            submission_timestamp=datetime.utcnow(),
        )
        self._reports[report_id] = report
        logger.info(f"Report {report_id} submitted by researcher {researcher_id}")
        return True

    def acknowledge_report(self, report_id: str) -> bool:
        """
        Acknowledge receipt of a vulnerability report.

        Args:
            report_id: Unique identifier for the report

        Returns:
            True if acknowledgement was successful, False if report not found

        Raises:
            ValueError: If report_id is invalid
        """
        if not report_id or not report_id.strip():
            raise ValueError("Report ID cannot be empty")

        report = self._reports.get(report_id)
        if not report:
            logger.warning(f"Report {report_id} not found")
            return False

        report.acknowledge()
        return True

    def triage_report(self, report_id: str) -> bool:
        """
        Triage a vulnerability report.

        Args:
            report_id: Unique identifier for the report

        Returns:
            True if triage was successful, False if report not found

        Raises:
            ValueError: If report_id is invalid
        """
        if not report_id or not report_id.strip():
            raise ValueError("Report ID cannot be empty")

        report = self._reports.get(report_id)
        if not report:
            logger.warning(f"Report {report_id} not found")
            return False

        report.triage()
        return True

    def remediate_report(self, report_id: str) -> bool:
        """
        Mark a vulnerability report as remediated.

        Args:
            report_id: Unique identifier for the report

        Returns:
            True if remediation was successful, False if report not found

        Raises:
            ValueError: If report_id is invalid
        """
        if not report_id or not report_id.strip():
            raise ValueError("Report ID cannot be empty")

        report = self._reports.get(report_id)
        if not report:
            logger.warning(f"Report {report_id} not found")
            return False

        report.remediate()
        return True

    def get_report(self, report_id: str) -> Optional[VulnerabilityReport]:
        """
        Get a vulnerability report by ID.

        Args:
            report_id: Unique identifier for the report

        Returns:
            Vulnerability report if found, None otherwise

        Raises:
            ValueError: If report_id is invalid
        """
        if not report_id or not report_id.strip():
            raise ValueError("Report ID cannot be empty")

        return self._reports.get(report_id)

    def add_in_scope_system(self, system: str) -> None:
        """
        Add a system to the in-scope list.

        Args:
            system: System identifier or URL

        Raises:
            ValueError: If system is invalid
        """
        if not system or not system.strip():
            raise ValueError("System cannot be empty")

        self._in_scope_systems.add(system.strip())
        logger.info(f"Added in-scope system: {system}")

    def add_out_of_scope_system(self, system: str) -> None:
        """
        Add a system to the out-of-scope list.

        Args:
            system: System identifier or URL

        Raises:
            ValueError: If system is invalid
        """
        if not system or not system.strip():
            raise ValueError("System cannot be empty")

        self._out_of_scope_systems.add(system.strip())
        logger.info(f"Added out-of-scope system: {system}")

    def is_in_scope(self, system: str) -> bool:
        """
        Check if a system is in scope for testing.

        Args:
            system: System identifier or URL

        Returns:
            True if system is in scope, False otherwise

        Raises:
            ValueError: If system is invalid
        """
        if not system or not system.strip():
            raise ValueError("System cannot be empty")

        return system.strip() in self._in_scope_systems

    def is_out_of_scope(self, system: str) -> bool:
        """
        Check if a system is out of scope for testing.

        Args:
            system: System identifier or URL

        Returns:
            True if system is out of scope, False otherwise

        Raises:
            ValueError: If system is invalid
        """
        if not system or not system.strip():
            raise ValueError("System cannot be empty")

        return system.strip() in self._out_of_scope_systems

    def is_method_prohibited(self, method: str) -> bool:
        """
        Check if a testing method is prohibited.

        Args:
            method: Testing method name

        Returns:
            True if method is prohibited, False otherwise

        Raises:
            ValueError: If method is invalid
        """
        if not method or not method.strip():
            raise ValueError("Method cannot be empty")

        return method.strip().lower() in self._prohibited_methods

    def get_safe_harbor_text(self) -> str:
        """
        Generate the full safe harbor clause text.

        Returns:
            Formatted safe harbor clause text
        """
        in_scope_list = "\n".join(f"  - {s}" for s in sorted(self._in_scope_systems))
        out_of_scope_list = "\n".join(f"  - {s}" for s in sorted(self._out_of_scope_systems))
        prohibited_list = "\n".join(f"  - {m}" for m in sorted(self._prohibited_methods))

        return f"""
SAFE HARBOR CLAUSE
==================
Program: {self._program_name}
Version: {self._version}
Effective Date: {self._effective_date.isoformat()}

1. SCOPE
--------
This Safe Harbor Clause applies to security researchers who:
- Register with the program and remain in good standing
- Test only in-scope systems
- Follow responsible disclosure guidelines
- Do not engage in prohibited activities

In-Scope Systems:
{in_scope_list}

Out-of-Scope Systems:
{out_of_scope_list}

2. LEGAL PROTECTIONS
-------------------
GetBankable will not pursue legal action against researchers who:
- Comply with this policy
- Report findings through the designated channels
- Allow reasonable time for remediation
- Do not access or exfiltrate user data beyond what is necessary

3. PROHIBITED ACTIVITIES
-----------------------
The following activities are strictly prohibited:
{prohibited_list}

4. DISCLOSURE REQUIREMENTS
-------------------------
- Researchers must acknowledge findings within {self._remediation_timeline.acknowledgement_hours} hours
- Triage must be completed within {self._remediation_timeline.triage_hours} hours
- Minimum disclosure period: {self._remediation_timeline.minimum_disclosure_days} days

5. REMEDIATION TIMELINES
-----------------------
- Critical: {SeverityLevel.CRITICAL.remediation_days} days
- High: {SeverityLevel.HIGH.remediation_days} days
- Medium: {SeverityLevel.MEDIUM.remediation_days} days
- Low: {SeverityLevel.LOW.remediation_days} days
-