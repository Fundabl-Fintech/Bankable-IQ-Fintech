"""
OWASP ASVS Level 2 Baseline Checklist with Level 3 Extensions
=============================================================

Owner: Platform Security Team
Depends On: Issues #1345, #1357
Blocks: None
Spec Section: §10.4
Maturity Target: Foundation
Last Updated: 2026-06-03

This module implements a comprehensive security checklist management system
for OWASP ASVS compliance. It provides structured data models, validation,
and reporting capabilities for security verification requirements.
"""

from __future__ import annotations

import enum
import json
import logging
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union, Any, Final
from uuid import UUID, uuid4

import yaml
from pydantic import BaseModel, Field, validator, root_validator, ValidationError

# Configure module logger
logger = logging.getLogger(__name__)

# Constants
ASVS_VERSION: Final[str] = "4.0.3"
COMPLIANCE_SERVICES: Final[Set[str]] = {"compliance-svc", "credit-svc"}
DEFAULT_RETENTION_DAYS: Final[int] = 90
MAX_SESSION_INACTIVITY_MINUTES: Final[int] = 15
MAX_CONCURRENT_SESSIONS: Final[int] = 3
PASSWORD_MIN_LENGTH: Final[int] = 12
ACCOUNT_LOCKOUT_THRESHOLD: Final[int] = 5
ACCOUNT_LOCKOUT_DURATION_MINUTES: Final[int] = 1


class SecurityLevel(str, enum.Enum):
    """Security verification levels as defined by OWASP ASVS."""
    
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"


class ComplianceStatus(str, enum.Enum):
    """Status values for checklist items."""
    
    PASS = "✅ Pass"
    FAIL = "❌ Fail"
    IN_PROGRESS = "⏳ In Progress"
    NOT_STARTED = "🔲 Not Started"
    NOT_APPLICABLE = "N/A Not Applicable"


class VerificationCategory(str, enum.Enum):
    """ASVS verification requirement categories."""
    
    ARCHITECTURE = "V1: Architecture, Design and Threat Modeling"
    AUTHENTICATION = "V2: Authentication Verification Requirements"
    SESSION_MANAGEMENT = "V3: Session Management Verification Requirements"
    ACCESS_CONTROL = "V4: Access Control Verification Requirements"
    VALIDATION = "V5: Validation, Sanitization and Encoding Verification Requirements"
    CRYPTOGRAPHY = "V6: Stored Cryptography Verification Requirements"
    ERROR_HANDLING = "V7: Error Handling and Logging Verification Requirements"
    DATA_PROTECTION = "V8: Data Protection Verification Requirements"


class ASVSRequirement(BaseModel):
    """Represents a single ASVS verification requirement."""
    
    id: str = Field(..., description="ASVS requirement identifier (e.g., '1.1.1')")
    description: str = Field(..., min_length=1, max_length=500, description="Requirement description")
    level: SecurityLevel = Field(..., description="ASVS security level")
    status: ComplianceStatus = Field(default=ComplianceStatus.NOT_STARTED, description="Current compliance status")
    notes: Optional[str] = Field(default=None, max_length=2000, description="Implementation notes")
    is_level3_extension: bool = Field(default=False, description="Whether this is a Level 3 extension")
    applicable_services: Set[str] = Field(default_factory=lambda: {"all"}, description="Services this applies to")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update timestamp")
    version: str = Field(default=ASVS_VERSION, description="ASVS version")
    
    @validator("id")
    def validate_requirement_id(cls, value: str) -> str:
        """Validate ASVS requirement ID format."""
        pattern = r"^\d+\.\d+\.\d+$"
        if not re.match(pattern, value):
            raise ValueError(f"Invalid requirement ID format: {value}. Expected format: X.Y.Z")
        return value
    
    @validator("applicable_services")
    def validate_services(cls, value: Set[str]) -> Set[str]:
        """Validate service names."""
        valid_services = {"all", "compliance-svc", "credit-svc", "platform-svc", "user-svc"}
        invalid_services = value - valid_services
        if invalid_services:
            raise ValueError(f"Invalid service names: {invalid_services}")
        return value
    
    @root_validator
    def validate_level3_extension(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        """Validate Level 3 extension consistency."""
        if values.get("is_level3_extension") and values.get("level") != SecurityLevel.L3:
            raise ValueError("Level 3 extensions must have L3 security level")
        return values
    
    def update_status(self, new_status: ComplianceStatus, notes: Optional[str] = None) -> None:
        """Update requirement status with validation."""
        if not isinstance(new_status, ComplianceStatus):
            raise TypeError(f"Expected ComplianceStatus, got {type(new_status)}")
        
        old_status = self.status
        self.status = new_status
        self.updated_at = datetime.utcnow()
        
        if notes:
            self.notes = notes
        
        logger.info(
            "Requirement %s status updated: %s -> %s",
            self.id, old_status.value, new_status.value
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Serialize requirement to dictionary."""
        return {
            "id": self.id,
            "description": self.description,
            "level": self.level.value,
            "status": self.status.value,
            "notes": self.notes,
            "is_level3_extension": self.is_level3_extension,
            "applicable_services": list(self.applicable_services),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "version": self.version
        }


class ASVSCategory(BaseModel):
    """Represents an ASVS verification category with its requirements."""
    
    category: VerificationCategory = Field(..., description="Verification category")
    requirements: List[ASVSRequirement] = Field(default_factory=list, description="List of requirements")
    description: Optional[str] = Field(default=None, description="Category description")
    
    def add_requirement(self, requirement: ASVSRequirement) -> None:
        """Add a requirement to the category with validation."""
        if not isinstance(requirement, ASVSRequirement):
            raise TypeError(f"Expected ASVSRequirement, got {type(requirement)}")
        
        # Check for duplicate IDs
        existing_ids = {req.id for req in self.requirements}
        if requirement.id in existing_ids:
            raise ValueError(f"Requirement ID {requirement.id} already exists in category")
        
        self.requirements.append(requirement)
        logger.debug("Added requirement %s to category %s", requirement.id, self.category.value)
    
    def get_requirements_by_level(self, level: SecurityLevel) -> List[ASVSRequirement]:
        """Get requirements filtered by security level."""
        return [req for req in self.requirements if req.level == level]
    
    def get_compliance_summary(self) -> Dict[str, int]:
        """Get compliance status counts for this category."""
        summary = {
            "total": len(self.requirements),
            "pass": 0,
            "fail": 0,
            "in_progress": 0,
            "not_started": 0,
            "not_applicable": 0
        }
        
        for req in self.requirements:
            if req.status == ComplianceStatus.PASS:
                summary["pass"] += 1
            elif req.status == ComplianceStatus.FAIL:
                summary["fail"] += 1
            elif req.status == ComplianceStatus.IN_PROGRESS:
                summary["in_progress"] += 1
            elif req.status == ComplianceStatus.NOT_STARTED:
                summary["not_started"] += 1
            elif req.status == ComplianceStatus.NOT_APPLICABLE:
                summary["not_applicable"] += 1
        
        return summary


class ASVSChecklistManager:
    """
    Manages the complete ASVS compliance checklist.
    
    This class provides methods for loading, saving, and querying
    ASVS requirements across all categories.
    """
    
    def __init__(self, storage_path: Optional[Path] = None) -> None:
        """
        Initialize the checklist manager.
        
        Args:
            storage_path: Optional path for persisting checklist data.
                         If None, uses in-memory storage only.
        
        Raises:
            ValueError: If storage_path is provided but invalid.
        """
        self._categories: Dict[VerificationCategory, ASVSCategory] = {}
        self._storage_path: Optional[Path] = storage_path
        
        if storage_path is not None:
            if not isinstance(storage_path, Path):
                raise ValueError(f"Expected Path, got {type(storage_path)}")
            self._storage_path = storage_path
            logger.info("Checklist manager initialized with storage path: %s", storage_path)
        else:
            logger.info("Checklist manager initialized with in-memory storage")
    
    def add_category(self, category: ASVSCategory) -> None:
        """
        Add a category to the checklist.
        
        Args:
            category: The ASVS category to add.
        
        Raises:
            TypeError: If category is not an ASVSCategory instance.
            ValueError: If category already exists.
        """
        if not isinstance(category, ASVSCategory):
            raise TypeError(f"Expected ASVSCategory, got {type(category)}")
        
        if category.category in self._categories:
            raise ValueError(f"Category {category.category.value} already exists")
        
        self._categories[category.category] = category
        logger.info("Added category: %s", category.category.value)
    
    def get_category(self, category: VerificationCategory) -> Optional[ASVSCategory]:
        """
        Get a category by its enum value.
        
        Args:
            category: The verification category to retrieve.
        
        Returns:
            The ASVSCategory if found, None otherwise.
        """
        return self._categories.get(category)
    
    def get_all_categories(self) -> List[ASVSCategory]:
        """Get all categories in the checklist."""
        return list(self._categories.values())
    
    def get_requirements_by_service(self, service: str) -> Dict[VerificationCategory, List[ASVSRequirement]]:
        """
        Get all requirements applicable to a specific service.
        
        Args:
            service: The service name to filter by.
        
        Returns:
            Dictionary mapping categories to their applicable requirements.
        
        Raises:
            ValueError: If service name is invalid.
        """
        valid_services = {"all", "compliance-svc", "credit-svc", "platform-svc", "user-svc"}
        if service not in valid_services:
            raise ValueError(f"Invalid service name: {service}")
        
        result: Dict[VerificationCategory, List[ASVSRequirement]] = {}
        
        for category in self._categories.values():
            applicable = [
                req for req in category.requirements
                if "all" in req.applicable_services or service in req.applicable_services
            ]
            if applicable:
                result[category.category] = applicable
        
        return result
    
    def get_level3_extensions(self) -> List[ASVSRequirement]:
        """Get all Level 3 extension requirements."""
        extensions = []
        for category in self._categories.values():
            for req in category.requirements:
                if req.is_level3_extension:
                    extensions.append(req)
        return extensions
    
    def get_overall_compliance_summary(self) -> Dict[str, Any]:
        """
        Get overall compliance summary across all categories.
        
        Returns:
            Dictionary with overall compliance statistics.
        """
        total = 0
        passed = 0
        failed = 0
        in_progress = 0
        not_started = 0
        not_applicable = 0
        
        for category in self._categories.values():
            summary = category.get_compliance_summary()
            total += summary["total"]
            passed += summary["pass"]
            failed += summary["fail"]
            in_progress += summary["in_progress"]
            not_started += summary["not_started"]
            not_applicable += summary["not_applicable"]
        
        compliance_percentage = (passed / total * 100) if total > 0 else 0.0
        
        return {
            "total_requirements": total,
            "passed": passed,
            "failed": failed,
            "in_progress": in_progress,
            "not_started": not_started,
            "not_applicable": not_applicable,
            "compliance_percentage": round(compliance_percentage, 2),
            "asvs_version": ASVS_VERSION,
            "generated_at": datetime.utcnow().isoformat()
        }
    
    def save_to_file(self, file_path: Optional[Path] = None) -> None:
        """
        Save checklist to a JSON file.
        
        Args:
            file_path: Optional file path. Uses storage_path if not provided.
        
        Raises:
            ValueError: If no file path is available.
            IOError: If file cannot be written.
        """
        save_path = file_path or self._storage_path
        if save_path is None:
            raise ValueError("No file path specified for saving")
        
        try:
            data = {
                "asvs_version": ASVS_VERSION,
                "generated_at": datetime.utcnow().isoformat(),
                "categories": {}
            }
            
            for category in self._categories.values():
                data["categories"][category.category.value] = {
                    "description": category.description,
                    "requirements": [req.to_dict() for req in category.requirements]
                }
            
            save_path.parent.mkdir(parents=True, exist_ok=True)
            with open(save_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            logger.info("Checklist saved to %s", save_path)
        except IOError as e:
            logger.error("Failed to save checklist to %s: %s", save_path, e)
            raise
    
    def load_from_file(self, file_path: Optional[Path] = None) -> None:
        """
        Load checklist from a JSON file.
        
        Args:
            file_path: Optional file path. Uses storage_path if not provided.
        
        Raises:
            ValueError: If no file path is available or file is invalid.
            FileNotFoundError: If file does not exist.
            json.JSONDecodeError: If file contains invalid JSON.
        """
        load_path = file_path or self._storage_path
        if load_path is None:
            raise ValueError("No file path specified for loading")
        
        if not load_path.exists():
            raise FileNotFoundError(f"Checklist file not found: {load_path}")
        
        try:
            with open(load_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            self._categories.clear()
            
            for category_name, category_data in data.get("categories", {}).items():
                try:
                    category_enum = VerificationCategory(category_name)
                except ValueError:
                    logger.warning("Unknown category: %s, skipping", category_name)
                    continue
                
                category = ASVSCategory(
                    category=category_enum,
                    description=category_data.get("description")
                )
                
                for req_data in category_data.get("requirements", []):
                    try:
                        requirement = ASVSRequirement(**req_data)
                        category.add_requirement(requirement)
                    except ValidationError as e:
                        logger.error("Invalid requirement data: %s", e)
                        continue
                
                self._categories[category_enum] = category
            
            logger.info("Checklist loaded from %s", load_path)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            logger.error("Failed to load checklist from %s: %s", load_path, e)
            raise
    
    def export_to_yaml(self, file_path: Path) -> None:
        """
        Export checklist to YAML format.
        
        Args:
            file_path: Path to save the YAML file.
        
        Raises:
            IOError: If file cannot be written.
        """
        try:
            data = {
                "asvs_version": ASVS_VERSION,
                "generated_at": datetime.utcnow().isoformat(),
                "categories": {}
            }
            
            for category in self._categories.values():
                data["categories"][category.category.value] = {
                    "description": category.description,
                    "requirements": [req.to_dict() for req in category.requirements]
                }
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
            
            logger.info("Checklist exported to YAML: %s", file_path)
        except IOError as e:
            logger.error("Failed to export checklist to %s: %s", file_path, e)
            raise
    
    def generate_compliance_report(self) -> str:
        """
        Generate a human-readable compliance report.
        
        Returns:
            Formatted string with compliance report.
        """
        summary = self.get_overall_compliance_summary()
        
        report_parts = [
            "=" * 70,
            "OWASP ASVS COMPLIANCE REPORT",
            "=" * 70,
            f"ASVS Version: {summary['asvs_version']}",
            f"Generated: {summary['generated_at']}",
            "",
            "OVERALL COMPLIANCE SUMMARY",
            "-" * 30,
            f"Total Requirements: {summary['total_requirements']}",
            f"Passed: {summary['passed']}",
            f"Failed: {summary['failed']}",
            f"In Progress: {summary['in_progress']}",
            f"Not Started: {summary['not_started']}",
            f"Not Applicable: {summary['not_applicable']}",
            f"Compliance: {summary['compliance_percentage']}%",
            "",
            "CATEGORY BREAKDOWN",
            "-" * 30
        ]
        
        for category in