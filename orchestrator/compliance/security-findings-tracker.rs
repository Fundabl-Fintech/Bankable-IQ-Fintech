// orchestrator/compliance/security-findings-tracker.rs
//
// Production-grade security findings tracker that integrates bug bounty findings
// from HackerOne/Bugcrowd alongside ZAP DAST, pen test, and SAST results.
//
// Requirements:
// - §10.4 Application Security Practices — Bug Bounty
// - §11.2 CI/CD Pipeline Integration
// - §16.3 Phase 3 Public Marketplace Launch gating
// - Maturity target: compounding_capital

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::RwLock;
use tracing::{debug, error, info, warn};
use uuid::Uuid;

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

#[derive(Error, Debug)]
pub enum FindingsTrackerError {
    #[error("duplicate finding id: {0}")]
    DuplicateFinding(String),

    #[error("finding not found: {0}")]
    FindingNotFound(String),

    #[error("invalid severity: {0}")]
    InvalidSeverity(String),

    #[error("invalid status transition from {from} to {to}")]
    InvalidStatusTransition { from: FindingStatus, to: FindingStatus },

    #[error("storage error: {0}")]
    StorageError(String),

    #[error("integration error: {0}")]
    IntegrationError(String),

    #[error("validation error: {0}")]
    ValidationError(String),

    #[error("concurrent modification detected for finding {0}")]
    ConcurrentModification(String),

    #[error("invalid input: {0}")]
    InvalidInput(String),

    #[error("rate limit exceeded")]
    RateLimitExceeded,
}

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

/// Source of the security finding
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum FindingSource {
    /// OWASP ZAP Dynamic Application Security Testing
    ZapDast,
    /// Manual penetration testing
    PenTest,
    /// Static Application Security Testing (e.g., Semgrep, SonarQube)
    Sast,
    /// Bug bounty platform (HackerOne, Bugcrowd, or direct disclosure)
    BugBounty(BugBountyPlatform),
    /// Responsible disclosure (non-platform)
    ResponsibleDisclosure,
}

impl FindingSource {
    /// Returns a human-readable string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            FindingSource::ZapDast => "ZAP DAST",
            FindingSource::PenTest => "Penetration Test",
            FindingSource::Sast => "SAST",
            FindingSource::BugBounty(_) => "Bug Bounty",
            FindingSource::ResponsibleDisclosure => "Responsible Disclosure",
        }
    }

    /// Returns the category for grouping purposes
    pub fn category(&self) -> &'static str {
        match self {
            FindingSource::ZapDast => "automated_dast",
            FindingSource::PenTest => "manual_pen_test",
            FindingSource::Sast => "automated_sast",
            FindingSource::BugBounty(_) => "bug_bounty",
            FindingSource::ResponsibleDisclosure => "responsible_disclosure",
        }
    }
}

/// Supported bug bounty platforms
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum BugBountyPlatform {
    HackerOne,
    Bugcrowd,
    DirectDisclosure,
}

impl BugBountyPlatform {
    /// Returns the platform's base URL for report links
    pub fn base_url(&self) -> &'static str {
        match self {
            BugBountyPlatform::HackerOne => "https://hackerone.com",
            BugBountyPlatform::Bugcrowd => "https://bugcrowd.com",
            BugBountyPlatform::DirectDisclosure => "https://security.getbankable.io",
        }
    }

    /// Returns the platform identifier for API integration
    pub fn api_identifier(&self) -> &'static str {
        match self {
            BugBountyPlatform::HackerOne => "hackerone",
            BugBountyPlatform::Bugcrowd => "bugcrowd",
            BugBountyPlatform::DirectDisclosure => "direct",
        }
    }
}

impl std::fmt::Display for BugBountyPlatform {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BugBountyPlatform::HackerOne => write!(f, "HackerOne"),
            BugBountyPlatform::Bugcrowd => write!(f, "Bugcrowd"),
            BugBountyPlatform::DirectDisclosure => write!(f, "Direct Disclosure"),
        }
    }
}

/// Severity classification per industry standards
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    Informational,
}

impl Severity {
    /// Convert from CVSS 3.x score range
    ///
    /// # Arguments
    /// * `score` - CVSS 3.x score between 0.0 and 10.0
    ///
    /// # Returns
    /// * `Ok(Severity)` if score is valid
    /// * `Err(FindingsTrackerError::InvalidSeverity)` if score is out of range
    pub fn from_cvss(score: f64) -> Result<Self, FindingsTrackerError> {
        if !(0.0..=10.0).contains(&score) {
            return Err(FindingsTrackerError::InvalidSeverity(format!(
                "CVSS score must be between 0.0 and 10.0, got: {}",
                score
            )));
        }

        match score {
            s if (9.0..=10.0).contains(&s) => Ok(Severity::Critical),
            s if (7.0..9.0).contains(&s) => Ok(Severity::High),
            s if (4.0..7.0).contains(&s) => Ok(Severity::Medium),
            s if (0.1..4.0).contains(&s) => Ok(Severity::Low),
            _ => Ok(Severity::Informational),
        }
    }

    /// Returns the numeric severity level for comparison
    pub fn level(&self) -> u8 {
        match self {
            Severity::Critical => 5,
            Severity::High => 4,
            Severity::Medium => 3,
            Severity::Low => 2,
            Severity::Informational => 1,
        }
    }

    /// Returns the recommended SLA in hours for this severity
    pub fn sla_hours(&self) -> u32 {
        match self {
            Severity::Critical => 24,
            Severity::High => 48,
            Severity::Medium => 72,
            Severity::Low => 120,
            Severity::Informational => 168,
        }
    }
}

impl std::fmt::Display for Severity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Severity::Critical => write!(f, "Critical"),
            Severity::High => write!(f, "High"),
            Severity::Medium => write!(f, "Medium"),
            Severity::Low => write!(f, "Low"),
            Severity::Informational => write!(f, "Informational"),
        }
    }
}

/// Lifecycle status of a finding
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum FindingStatus {
    /// Newly reported, awaiting triage
    New,
    /// Under triage/analysis (SLA: 24h acknowledgement, 72h classification)
    UnderTriage,
    /// Triaged and acknowledged
    Acknowledged,
    /// Being remediated
    InProgress,
    /// Remediation verified
    Resolved,
    /// Accepted risk (no remediation planned)
    Accepted,
    /// False positive
    FalsePositive,
    /// Closed (resolved or otherwise concluded)
    Closed,
}

impl FindingStatus {
    /// Valid state transitions for the finding lifecycle
    ///
    /// # Arguments
    /// * `target` - The target status to transition to
    ///
    /// # Returns
    /// * `true` if the transition is valid
    pub fn can_transition_to(&self, target: &FindingStatus) -> bool {
        match (self, target) {
            (FindingStatus::New, FindingStatus::UnderTriage) => true,
            (FindingStatus::New, FindingStatus::FalsePositive) => true,
            (FindingStatus::UnderTriage, FindingStatus::Acknowledged) => true,
            (FindingStatus::UnderTriage, FindingStatus::FalsePositive) => true,
            (FindingStatus::Acknowledged, FindingStatus::InProgress) => true,
            (FindingStatus::Acknowledged, FindingStatus::Accepted) => true,
            (FindingStatus::InProgress, FindingStatus::Resolved) => true,
            (FindingStatus::InProgress, FindingStatus::Accepted) => true,
            (FindingStatus::Resolved, FindingStatus::Closed) => true,
            (FindingStatus::Accepted, FindingStatus::Closed) => true,
            (FindingStatus::FalsePositive, FindingStatus::Closed) => true,
            _ => false,
        }
    }

    /// Returns whether this status requires active attention
    pub fn requires_action(&self) -> bool {
        matches!(
            self,
            FindingStatus::New | FindingStatus::UnderTriage | FindingStatus::Acknowledged
        )
    }

    /// Returns whether this is a terminal status
    pub fn is_terminal(&self) -> bool {
        matches!(self, FindingStatus::Closed)
    }
}

impl std::fmt::Display for FindingStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FindingStatus::New => write!(f, "New"),
            FindingStatus::UnderTriage => write!(f, "Under Triage"),
            FindingStatus::Acknowledged => write!(f, "Acknowledged"),
            FindingStatus::InProgress => write!(f, "In Progress"),
            FindingStatus::Resolved => write!(f, "Resolved"),
            FindingStatus::Accepted => write!(f, "Accepted"),
            FindingStatus::FalsePositive => write!(f, "False Positive"),
            FindingStatus::Closed => write!(f, "Closed"),
        }
    }
}

/// Payout tier for bug bounty findings
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum PayoutTier {
    Critical(u64),
    High(u64),
    Medium(u64),
    Low(u64),
    Informational(u64),
}

impl PayoutTier {
    /// Create a new payout tier with validation
    ///
    /// # Arguments
    /// * `severity` - The severity level
    /// * `amount` - The payout amount in USD cents
    ///
    /// # Returns
    /// * `Ok(PayoutTier)` if amount is valid
    /// * `Err(FindingsTrackerError::InvalidInput)` if amount is invalid
    pub fn new(severity: &Severity, amount: u64) -> Result<Self, FindingsTrackerError> {
        if amount == 0 {
            return Err(FindingsTrackerError::InvalidInput(
                "Payout amount must be greater than 0".to_string(),
            ));
        }

        match severity {
            Severity::Critical => Ok(PayoutTier::Critical(amount)),
            Severity::High => Ok(PayoutTier::High(amount)),
            Severity::Medium => Ok(PayoutTier::Medium(amount)),
            Severity::Low => Ok(PayoutTier::Low(amount)),
            Severity::Informational => Ok(PayoutTier::Informational(amount)),
        }
    }

    /// Returns the payout amount in USD cents
    pub fn amount(&self) -> u64 {
        match self {
            PayoutTier::Critical(amount) => *amount,
            PayoutTier::High(amount) => *amount,
            PayoutTier::Medium(amount) => *amount,
            PayoutTier::Low(amount) => *amount,
            PayoutTier::Informational(amount) => *amount,
        }
    }

    /// Returns the severity level for this payout tier
    pub fn severity(&self) -> Severity {
        match self {
            PayoutTier::Critical(_) => Severity::Critical,
            PayoutTier::High(_) => Severity::High,
            PayoutTier::Medium(_) => Severity::Medium,
            PayoutTier::Low(_) => Severity::Low,
            PayoutTier::Informational(_) => Severity::Informational,
        }
    }
}

/// A single security finding
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    /// Unique identifier
    pub id: Uuid,
    /// External identifier from source system
    pub external_id: Option<String>,
    /// Source of the finding
    pub source: FindingSource,
    /// Severity classification
    pub severity: Severity,
    /// Current lifecycle status
    pub status: FindingStatus,
    /// Title/summary of the finding
    pub title: String,
    /// Detailed description
    pub description: String,
    /// Affected component or service
    pub affected_component: String,
    /// CVSS score if applicable
    pub cvss_score: Option<f64>,
    /// CVE identifier if applicable
    pub cve_id: Option<String>,
    /// Payout information for bug bounty findings
    pub payout: Option<PayoutTier>,
    /// Reporter information (for bug bounty)
    pub reporter: Option<String>,
    /// Assigned triage team member
    pub assignee: Option<String>,
    /// Timestamp when the finding was created
    pub created_at: DateTime<Utc>,
    /// Timestamp when the finding was last updated
    pub updated_at: DateTime<Utc>,
    /// Timestamp when the finding was acknowledged
    pub acknowledged_at: Option<DateTime<Utc>>,
    /// Timestamp when the finding was resolved
    pub resolved_at: Option<DateTime<Utc>>,
    /// Remediation notes
    pub remediation_notes: Option<String>,
    /// Tags for categorization
    pub tags: Vec<String>,
    /// Version number for optimistic concurrency control
    pub version: u64,
}

impl Finding {
    /// Create a new finding with validation
    ///
    /// # Arguments
    /// * `source` - Source of the finding
    /// * `severity` - Severity classification
    /// * `title` - Title of the finding
    /// * `description` - Detailed description
    /// * `affected_component` - Affected component
    ///
    /// # Returns
    /// * `Ok(Finding)` if validation passes
    /// * `Err(FindingsTrackerError::ValidationError)` if validation fails
    pub fn new(
        source: FindingSource,
        severity: Severity,
        title: String,
        description: String,
        affected_component: String,
    ) -> Result<Self, FindingsTrackerError> {
        // Validate inputs
        if title.trim().is_empty() {
            return Err(FindingsTrackerError::ValidationError(
                "Title cannot be empty".to_string(),
            ));
        }

        if description.trim().is_empty() {
            return Err(FindingsTrackerError::ValidationError(
                "Description cannot be empty".to_string(),
            ));
        }

        if affected_component.trim().is_empty() {
            return Err(FindingsTrackerError::ValidationError(
                "Affected component cannot be empty".to_string(),
            ));
        }

        if title.len() > 500 {
            return Err(FindingsTrackerError::ValidationError(
                "Title exceeds maximum length of 500 characters".to_string(),
            ));
        }

        if description.len() > 10000 {
            return Err(FindingsTrackerError::ValidationError(
                "Description exceeds maximum length of 10000 characters".to_string(),
            ));
        }

        let now = Utc::now();

        Ok(Finding {
            id: Uuid::new_v4(),
            external_id: None,
            source,
            severity,
            status: FindingStatus::New,
            title: title.trim().to_string(),
            description: description.trim().to_string(),
            affected_component: affected_component.trim().to_string(),
            cvss_score: None,
            cve_id: None,
            payout: None,
            reporter: None,
            assignee: None,
            created_at: now,
            updated_at: now,
            acknowledged_at: None,
            resolved_at: None,
            remediation_notes: None,
            tags: Vec::new(),
            version: 1,
        })
    }

    /// Transition the finding to a new status with validation
    ///
    /// # Arguments
    /// * `new_status` - The target status
    ///
    /// # Returns
    /// * `Ok(())` if transition is valid
    /// * `Err(FindingsTrackerError::InvalidStatusTransition)` if transition is invalid
    pub fn transition_to(&mut self, new_status: FindingStatus) -> Result<(), FindingsTrackerError> {
        if !self.status.can_transition_to(&new_status) {
            return Err(FindingsTrackerError::InvalidStatusTransition {
                from: self.status.clone(),
                to: new_status,
            });
        }

        let now = Utc::now();

        // Update timestamps based on status
        match &new_status {
            FindingStatus::Acknowledged => {
                self.acknowledged_at = Some(now);
            }
            FindingStatus::Resolved => {
                self.resolved_at = Some(now);
            }
            _ => {}
        }

        self.status = new_status;
        self.updated_at = now;
        self.version += 1;

        Ok(())
    }

    /// Check if the finding is past its SLA
    pub fn is_past_sla(&self) -> bool {
        let sla_hours = self.severity.sla_hours() as i64;
        let elapsed = Utc::now() - self.created_at;
        elapsed.num_hours() > sla_hours
    }
}

/// Configuration for the findings tracker
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FindingsTrackerConfig {
    /// Maximum number of findings to store in memory
    pub max_findings: usize,
    /// Whether to enable automatic SLA monitoring
    pub enable_sla_monitoring: bool,
    /// Whether to enable rate