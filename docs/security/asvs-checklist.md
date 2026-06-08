"""
OWASP ASVS Level 2 Baseline Checklist

Owner: Platform Security Team
Depends On: [1345] (CI/CD Pipeline Configuration), [1357] (Secret Management Infrastructure)
Blocks: None
Spec Sections: §10.4 Application Security Practice Stack
Maturity Target: Foundation
Last Updated: 2026-06-08

This module implements the OWASP Application Security Verification Standard (ASVS)
Level 2 baseline checklist with Level 3 extensions for compliance-sensitive services.
"""

from __future__ import annotations

import enum
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union, Final

import yaml
from pydantic import BaseModel, Field, validator, ValidationError

# ---------------------------------------------------------------------------
# Constants and Configuration
# ---------------------------------------------------------------------------

SERVICE_NAME: Final[str] = "asvs-checklist"
LOG_FORMAT: Final[str] = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_LEVEL: Final[int] = logging.INFO
CHECKLIST_VERSION: Final[str] = "2.0.0"
COMPLIANCE_SERVICES: Final[Set[str]] = {"compliance-svc", "credit-svc"}
MAX_CHECKLIST_SIZE_BYTES: Final[int] = 10 * 1024 * 1024  # 10MB
ALLOWED_CHECKLIST_EXTENSIONS: Final[Set[str]] = {".md", ".yaml", ".yml", ".json"}
DEFAULT_ENCODING: Final[str] = "utf-8"
MAX_RETRY_ATTEMPTS: Final[int] = 3
RETRY_DELAY_SECONDS: Final[float] = 1.0

# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class ASVSChecklistError(Exception):
    """Base exception for ASVS checklist operations."""
    pass

class ChecklistValidationError(ASVSChecklistError):
    """Raised when checklist validation fails."""
    pass

class ChecklistNotFoundError(ASVSChecklistError):
    """Raised when a required checklist file is not found."""
    pass

class ComplianceViolationError(ASVSChecklistError):
    """Raised when compliance requirements are not met."""
    pass

class SecurityToolingError(ASVSChecklistError):
    """Raised when security tooling configuration fails."""
    pass

class FileOperationError(ASVSChecklistError):
    """Raised when file operations fail."""
    pass

class ConfigurationError(ASVSChecklistError):
    """Raised when configuration is invalid."""
    pass

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class VerificationStatus(str, enum.Enum):
    """Status of verification requirement implementation."""
    IMPLEMENTED = "✅"
    IN_PROGRESS = "🔄"
    NOT_IMPLEMENTED = "❌"
    LEVEL_3_REQUIRED = "🔒"
    NOT_APPLICABLE = "N/A"

    @classmethod
    def from_string(cls, value: str) -> "VerificationStatus":
        """Convert string to VerificationStatus with validation."""
        mapping = {
            "✅": cls.IMPLEMENTED,
            "🔄": cls.IN_PROGRESS,
            "❌": cls.NOT_IMPLEMENTED,
            "🔒": cls.LEVEL_3_REQUIRED,
            "N/A": cls.NOT_APPLICABLE,
        }
        if value not in mapping:
            raise ValueError(f"Invalid verification status: {value}")
        return mapping[value]

    def to_string(self) -> str:
        """Convert VerificationStatus to string representation."""
        reverse_mapping = {
            self.IMPLEMENTED: "✅",
            self.IN_PROGRESS: "🔄",
            self.NOT_IMPLEMENTED: "❌",
            self.LEVEL_3_REQUIRED: "🔒",
            self.NOT_APPLICABLE: "N/A",
        }
        return reverse_mapping[self]

class MaturityLevel(str, enum.Enum):
    """Maturity target levels for security practices."""
    FOUNDATION = "foundation"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

class SecurityToolType(str, enum.Enum):
    """Types of security tools supported."""
    SAST = "sast"
    DAST = "dast"
    SCA = "sca"
    SECRET_SCANNING = "secret_scanning"
    PENETRATION_TESTING = "penetration_testing"
    BUG_BOUNTY = "bug_bounty"

# ---------------------------------------------------------------------------
# Data Models
# ---------------------------------------------------------------------------

class VerificationRequirement(BaseModel):
    """Represents a single ASVS verification requirement."""
    
    requirement_id: str = Field(..., description="Unique requirement identifier (e.g., 1.1.1)")
    description: str = Field(..., min_length=1, max_length=500, description="Requirement description")
    status: VerificationStatus = Field(default=VerificationStatus.NOT_IMPLEMENTED)
    notes: Optional[str] = Field(None, max_length=1000, description="Implementation notes")
    service_scope: Optional[Set[str]] = Field(None, description="Services this requirement applies to")
    last_verified: Optional[datetime] = Field(None, description="Last verification timestamp")
    verified_by: Optional[str] = Field(None, description="Who performed the verification")

    @validator("requirement_id")
    def validate_requirement_id(cls, v: str) -> str:
        """Validate requirement ID format."""
        pattern = r"^\d+\.\d+\.\d+$"
        if not re.match(pattern, v):
            raise ValueError(f"Invalid requirement ID format: {v}. Expected format: X.Y.Z")
        return v

    @validator("status", pre=True)
    def validate_status(cls, v: Any) -> VerificationStatus:
        """Validate and convert status field."""
        if isinstance(v, VerificationStatus):
            return v
        if isinstance(v, str):
            return VerificationStatus.from_string(v)
        raise ValueError(f"Invalid status type: {type(v)}")

    @validator("service_scope")
    def validate_service_scope(cls, v: Optional[Set[str]]) -> Optional[Set[str]]:
        """Validate service scope values."""
        if v is not None:
            valid_services = {"compliance-svc", "credit-svc", "platform-svc", "auth-svc", "api-svc"}
            invalid_services = v - valid_services
            if invalid_services:
                raise ValueError(f"Invalid service names: {invalid_services}")
        return v

class ChecklistSection(BaseModel):
    """Represents a section of the ASVS checklist."""
    
    section_id: str = Field(..., description="Section identifier (e.g., V1)")
    section_name: str = Field(..., min_length=1, max_length=200, description="Section name")
    requirements: List[VerificationRequirement] = Field(default_factory=list)
    description: Optional[str] = Field(None, max_length=1000)

    @validator("section_id")
    def validate_section_id(cls, v: str) -> str:
        """Validate section ID format."""
        pattern = r"^V\d+(\.\d+)?$"
        if not re.match(pattern, v):
            raise ValueError(f"Invalid section ID format: {v}. Expected format: VX or VX.Y")
        return v

    @validator("requirements")
    def validate_requirements(cls, v: List[VerificationRequirement]) -> List[VerificationRequirement]:
        """Validate that requirements have unique IDs within a section."""
        requirement_ids = [req.requirement_id for req in v]
        if len(requirement_ids) != len(set(requirement_ids)):
            raise ValueError("Duplicate requirement IDs found in section")
        return v

class SecurityToolConfiguration(BaseModel):
    """Configuration for a security tool."""
    
    tool_type: SecurityToolType
    tool_name: str = Field(..., min_length=1, max_length=100)
    enabled: bool = Field(default=True)
    config_path: Optional[Path] = None
    scan_schedule: Optional[str] = None  # cron expression
    severity_threshold: str = Field(default="high", pattern="^(low|medium|high|critical)$")
    last_scan: Optional[datetime] = None
    findings_count: int = Field(default=0, ge=0)

class ASVSChecklist(BaseModel):
    """Complete ASVS checklist document."""
    
    version: str = Field(default=CHECKLIST_VERSION)
    owner: str = Field(default="Platform Security Team")
    depends_on: List[int] = Field(default_factory=lambda: [1345, 1357])
    blocks: List[int] = Field(default_factory=list)
    spec_sections: List[str] = Field(default_factory=lambda: ["§10.4"])
    maturity_target: MaturityLevel = Field(default=MaturityLevel.FOUNDATION)
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sections: List[ChecklistSection] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    security_tools: List[SecurityToolConfiguration] = Field(default_factory=list)

    def get_requirement(self, requirement_id: str) -> Optional[VerificationRequirement]:
        """Retrieve a specific requirement by ID."""
        for section in self.sections:
            for req in section.requirements:
                if req.requirement_id == requirement_id:
                    return req
        return None

    def get_compliance_score(self, service: Optional[str] = None) -> float:
        """Calculate compliance score for a specific service or overall."""
        total = 0
        implemented = 0
        
        for section in self.sections:
            for req in section.requirements:
                if service and req.service_scope and service not in req.service_scope:
                    continue
                total += 1
                if req.status in (VerificationStatus.IMPLEMENTED, VerificationStatus.LEVEL_3_REQUIRED):
                    implemented += 1
        
        return (implemented / total * 100) if total > 0 else 0.0

    def get_level3_requirements(self) -> List[VerificationRequirement]:
        """Get all Level 3 requirements for compliance-sensitive services."""
        level3_requirements = []
        for section in self.sections:
            for req in section.requirements:
                if req.status == VerificationStatus.LEVEL_3_REQUIRED:
                    level3_requirements.append(req)
        return level3_requirements

    def validate_compliance(self) -> Tuple[bool, List[str]]:
        """Validate compliance requirements are met."""
        violations = []
        
        # Check Level 3 requirements for compliance services
        for section in self.sections:
            for req in section.requirements:
                if req.service_scope and COMPLIANCE_SERVICES.intersection(req.service_scope):
                    if req.status == VerificationStatus.NOT_IMPLEMENTED:
                        violations.append(
                            f"Requirement {req.requirement_id} not implemented for compliance services"
                        )
        
        return len(violations) == 0, violations

# ---------------------------------------------------------------------------
# Logger Configuration
# ---------------------------------------------------------------------------

def setup_logger(
    name: str = SERVICE_NAME,
    level: int = LOG_LEVEL,
    log_format: str = LOG_FORMAT,
    log_file: Optional[Path] = None
) -> logging.Logger:
    """
    Configure and return a logger instance with proper formatting and handlers.
    
    Args:
        name: Logger name
        level: Logging level
        log_format: Log message format
        log_file: Optional file path for log output
        
    Returns:
        Configured logger instance
        
    Raises:
        ConfigurationError: If logger configuration fails
    """
    try:
        logger = logging.getLogger(name)
        logger.setLevel(level)
        
        # Clear existing handlers to prevent duplication
        logger.handlers.clear()
        
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_formatter = logging.Formatter(log_format)
        console_handler.setFormatter(console_formatter)
        logger.addHandler(console_handler)
        
        # Create file handler if specified
        if log_file:
            try:
                log_file = Path(log_file)
                log_file.parent.mkdir(parents=True, exist_ok=True)
                file_handler = logging.FileHandler(log_file, encoding=DEFAULT_ENCODING)
                file_handler.setLevel(level)
                file_formatter = logging.Formatter(log_format)
                file_handler.setFormatter(file_formatter)
                logger.addHandler(file_handler)
            except (OSError, IOError) as e:
                raise ConfigurationError(f"Failed to create log file {log_file}: {e}")
        
        # Prevent propagation to root logger
        logger.propagate = False
        
        return logger
        
    except Exception as e:
        raise ConfigurationError(f"Failed to configure logger: {e}")

# ---------------------------------------------------------------------------
# Checklist File Operations
# ---------------------------------------------------------------------------

class ChecklistFileManager:
    """Manages checklist file operations with proper error handling."""
    
    def __init__(self, logger: Optional[logging.Logger] = None):
        """Initialize the file manager with optional logger."""
        self.logger = logger or logging.getLogger(__name__)
    
    def load_checklist(self, file_path: Path) -> ASVSChecklist:
        """
        Load a checklist from a file with validation.
        
        Args:
            file_path: Path to the checklist file
            
        Returns:
            Loaded ASVSChecklist instance
            
        Raises:
            ChecklistNotFoundError: If file doesn't exist
            ChecklistValidationError: If file format is invalid
            FileOperationError: If file operations fail
        """
        try:
            file_path = Path(file_path).resolve()
            
            # Validate file exists
            if not file_path.exists():
                raise ChecklistNotFoundError(f"Checklist file not found: {file_path}")
            
            # Validate file extension
            if file_path.suffix.lower() not in ALLOWED_CHECKLIST_EXTENSIONS:
                raise ChecklistValidationError(
                    f"Invalid file extension: {file_path.suffix}. "
                    f"Allowed extensions: {ALLOWED_CHECKLIST_EXTENSIONS}"
                )
            
            # Validate file size
            file_size = file_path.stat().st_size
            if file_size > MAX_CHECKLIST_SIZE_BYTES:
                raise ChecklistValidationError(
                    f"File size {file_size} bytes exceeds maximum {MAX_CHECKLIST_SIZE_BYTES} bytes"
                )
            
            # Read file content
            try:
                content = file_path.read_text(encoding=DEFAULT_ENCODING)
            except (OSError, IOError) as e:
                raise FileOperationError(f"Failed to read file {file_path}: {e}")
            
            # Parse based on extension
            try:
                if file_path.suffix.lower() in {".yaml", ".yml"}:
                    data = yaml.safe_load(content)
                elif file_path.suffix.lower() == ".json":
                    data = json.loads(content)
                elif file_path.suffix.lower() == ".md":
                    data = self._parse_markdown(content)
                else:
                    raise ChecklistValidationError(f"Unsupported file format: {file_path.suffix}")
            except (yaml.YAMLError, json.JSONDecodeError) as e:
                raise ChecklistValidationError(f"Failed to parse file {file_path}: {e}")
            
            # Validate and create checklist
            try:
                checklist = ASVSChecklist(**data)
            except ValidationError as e:
                raise ChecklistValidationError(f"Checklist validation failed: {e}")
            
            self.logger.info(f"Successfully loaded checklist from {file_path}")
            return checklist
            
        except (ChecklistNotFoundError, ChecklistValidationError, FileOperationError):
            raise
        except Exception as e:
            raise FileOperationError(f"Unexpected error loading checklist: {e}")
    
    def save_checklist(self, checklist: ASVSChecklist, file_path: Path) -> None:
        """
        Save a checklist to a file with validation.
        
        Args:
            checklist: ASVSChecklist instance to save
            file_path: Path where to save the checklist
            
        Raises:
            FileOperationError: If file operations fail
            ChecklistValidationError: If checklist validation fails
        """
        try:
            file_path = Path(file_path).resolve()
            
            # Validate file extension
            if file_path.suffix.lower() not in ALLOWED_CHECKLIST_EXTENSIONS:
                raise ChecklistValidationError(
                    f"Invalid file extension: {file_path.suffix}. "
                    f"Allowed extensions: {ALLOWED_CHECKLIST_EXTENSIONS}"
                )
            
            # Update timestamp
            checklist.last_updated = datetime.now(timezone.utc)
            
            # Convert to dict
            try:
                data = checklist.dict()
            except Exception as e:
                raise ChecklistValidationError(f"Failed to convert checklist to dict: {e}")
            
            # Create parent directories
            try:
                file_path.parent.mkdir(parents=True, exist_ok=True)
            except (OSError, IOError) as e:
                raise FileOperationError(f"Failed to create directory {file_path.parent}: {e}")
            
            # Write file
            try:
                if file_path.suffix.lower() in {".yaml", ".yml"}:
                    with open(file_path, "w", encoding=DEFAULT_ENCODING) as f:
                        yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
                elif file_path.suffix.lower() == ".json":
                    with open(file_path, "w", encoding=DEFAULT_ENCODING) as f:
                        json.dump(data, f, indent=2, ensure_ascii=False, default=str)
                elif file_path.suffix.lower() == ".md":
                    self._write_markdown(checklist, file_path)
            except (OSError, IOError) as e:
                raise FileOperationError(f"Failed to write file {file_path}: {e}")
            
            self.logger.info(f"Successfully saved checklist to {file_path}")
            
        except (ChecklistValidationError, FileOperationError):
            raise
        except Exception as e:
            raise FileOperationError(f"Unexpected error saving checklist: {e}")
    
    def _parse_markdown(self, content: str) -> Dict[str, Any]:
        """Parse markdown content into checklist data structure."""
        # This is a simplified parser - in production, use a proper markdown parser
        data = {
            "version": CHECKLIST_VERSION,
            "sections": [],
            "metadata": {}
        }
        
        current_section