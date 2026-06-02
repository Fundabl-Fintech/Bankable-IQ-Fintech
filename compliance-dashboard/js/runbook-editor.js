/**
 * compliance-dashboard/js/runbook-editor.js
 * Penetration test runbook editor with version control, approval workflow, and SLA tracking
 * Owner: service:compliance
 * Spec: §10.4 Application Security Practice Stack
 * Maturity: lender_ready
 */

'use strict';

// ============================================================================
// Constants & Configuration
// ============================================================================

const RUNBOOK_CONFIG = Object.freeze({
  API_BASE: '/api/v1/runbooks',
  VERSION_PREFIX: 'v',
  DEFAULT_SLA_HOURS: 72,
  CRITICAL_SLA_HOURS: 24,
  HIGH_SLA_HOURS: 48,
  MEDIUM_SLA_HOURS: 120,
  LOW_SLA_HOURS: 240,
  MAX_RETENTION_VERSIONS: 50,
  APPROVAL_THRESHOLD: 2,
  AUTO_ARCHIVE_DAYS: 90,
  STORAGE_KEY: 'runbook_editor_state',
  DEBOUNCE_MS: 500,
});

const RUNBOOK_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  SUPERSEDED: 'superseded',
});

const SEVERITY_LEVELS = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
});

const APPROVAL_DECISIONS = Object.freeze({
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
  ABSTAIN: 'abstain',
});

// ============================================================================
// Error Classes
// ============================================================================

class RunbookError extends Error {
  constructor(message, code = 'RUNBOOK_ERROR', statusCode = 500) {
    super(message);
    this.name = 'RunbookError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends RunbookError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

class VersionConflictError extends RunbookError {
  constructor(currentVersion, expectedVersion) {
    super(
      `Version conflict: current ${currentVersion}, expected ${expectedVersion}`,
      'VERSION_CONFLICT',
      409
    );
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

class ApprovalError extends RunbookError {
  constructor(message) {
    super(message, 'APPROVAL_ERROR', 403);
  }
}

class SLAViolationError extends RunbookError {
  constructor(severity, elapsedHours, slaHours) {
    super(
      `SLA violation: ${severity} finding exceeded ${slaHours}h limit (${elapsedHours}h elapsed)`,
      'SLA_VIOLATION',
      422
    );
    this.severity = severity;
    this.elapsedHours = elapsedHours;
    this.slaHours = slaHours;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

const Utils = {
  generateId: () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  },

  deepClone: (obj) => {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (e) {
      throw new RunbookError('Failed to clone object', 'CLONE_ERROR');
    }
  },

  debounce: (fn, delay = RUNBOOK_CONFIG.DEBOUNCE_MS) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  validateEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  sanitizeInput: (input) => {
    if (typeof input !== 'string') return input;
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  formatDate: (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  calculateSLARemaining: (createdAt, severity) => {
    const slaHours = {
      [SEVERITY_LEVELS.CRITICAL]: RUNBOOK_CONFIG.CRITICAL_SLA_HOURS,
      [SEVERITY_LEVELS.HIGH]: RUNBOOK_CONFIG.HIGH_SLA_HOURS,
      [SEVERITY_LEVELS.MEDIUM]: RUNBOOK_CONFIG.MEDIUM_SLA_HOURS,
      [SEVERITY_LEVELS.LOW]: RUNBOOK_CONFIG.LOW_SLA_HOURS,
      [SEVERITY_LEVELS.INFO]: RUNBOOK_CONFIG.DEFAULT_SLA_HOURS,
    };

    const created = new Date(createdAt).getTime();
    const now = Date.now();
    const elapsedHours = (now - created) / (1000 * 60 * 60);
    const allowed = slaHours[severity] || RUNBOOK_CONFIG.DEFAULT_SLA_HOURS;
    const remaining = Math.max(0, allowed - elapsedHours);

    return {
      elapsedHours: Math.round(elapsedHours * 100) / 100,
      slaHours: allowed,
      remainingHours: Math.round(remaining * 100) / 100,
      isViolated: remaining <= 0,
      percentageUsed: Math.min(100, Math.round((elapsedHours / allowed) * 100)),
    };
  },
};

// ============================================================================
// Version Control System
// ============================================================================

class VersionControl {
  constructor(runbookId) {
    this.runbookId = runbookId;
    this.versions = [];
    this.currentVersion = null;
  }

  createInitialVersion(content, author) {
    const version = {
      id: Utils.generateId(),
      runbookId: this.runbookId,
      version: `${RUNBOOK_CONFIG.VERSION_PREFIX}1.0.0`,
      content: Utils.deepClone(content),
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
      },
      timestamp: new Date().toISOString(),
      commitMessage: 'Initial version',
      checksum: this._calculateChecksum(content),
      parentVersion: null,
      changes: [],
    };

    this.versions.push(version);
    this.currentVersion = version;
    return version;
  }

  createVersion(content, author, commitMessage = '') {
    if (!this.currentVersion) {
      throw new RunbookError('No base version exists', 'NO_BASE_VERSION');
    }

    const newVersionNumber = this._incrementVersion(this.currentVersion.version);
    const changes = this._diffVersions(this.currentVersion.content, content);

    const version = {
      id: Utils.generateId(),
      runbookId: this.runbookId,
      version: newVersionNumber,
      content: Utils.deepClone(content),
      author: {
        id: author.id,
        name: author.name,
        email: author.email,
      },
      timestamp: new Date().toISOString(),
      commitMessage: commitMessage || `Version ${newVersionNumber}`,
      checksum: this._calculateChecksum(content),
      parentVersion: this.currentVersion.id,
      changes,
    };

    this.versions.push(version);
    this.currentVersion = version;

    // Enforce retention policy
    this._enforceRetention();

    return version;
  }

  getVersion(versionId) {
    return this.versions.find((v) => v.id === versionId) || null;
  }

  getVersionByNumber(versionNumber) {
    return this.versions.find((v) => v.version === versionNumber) || null;
  }

  rollbackToVersion(versionId, author) {
    const targetVersion = this.getVersion(versionId);
    if (!targetVersion) {
      throw new RunbookError('Version not found', 'VERSION_NOT_FOUND');
    }

    return this.createVersion(
      targetVersion.content,
      author,
      `Rollback to version ${targetVersion.version}`
    );
  }

  compareVersions(versionId1, versionId2) {
    const v1 = this.getVersion(versionId1);
    const v2 = this.getVersion(versionId2);

    if (!v1 || !v2) {
      throw new RunbookError('One or both versions not found', 'VERSION_NOT_FOUND');
    }

    return {
      version1: v1.version,
      version2: v2.version,
      changes: this._diffVersions(v1.content, v2.content),
      isIdentical: v1.checksum === v2.checksum,
    };
  }

  getVersionHistory() {
    return [...this.versions].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }

  _calculateChecksum(content) {
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }

  _incrementVersion(currentVersion) {
    const parts = currentVersion.replace(RUNBOOK_CONFIG.VERSION_PREFIX, '').split('.');
    const major = parseInt(parts[0], 10);
    const minor = parseInt(parts[1], 10);
    const patch = parseInt(parts[2], 10) + 1;

    return `${RUNBOOK_CONFIG.VERSION_PREFIX}${major}.${minor}.${patch}`;
  }

  _diffVersions(oldContent, newContent) {
    const changes = [];
    const oldKeys = Object.keys(oldContent || {});
    const newKeys = Object.keys(newContent || {});

    // Detect added keys
    newKeys.forEach((key) => {
      if (!oldKeys.includes(key)) {
        changes.push({ type: 'added', key, value: newContent[key] });
      }
    });

    // Detect removed keys
    oldKeys.forEach((key) => {
      if (!newKeys.includes(key)) {
        changes.push({ type: 'removed', key, oldValue: oldContent[key] });
      }
    });

    // Detect modified keys
    oldKeys.forEach((key) => {
      if (
        newKeys.includes(key) &&
        JSON.stringify(oldContent[key]) !== JSON.stringify(newContent[key])
      ) {
        changes.push({
          type: 'modified',
          key,
          oldValue: oldContent[key],
          newValue: newContent[key],
        });
      }
    });

    return changes;
  }

  _enforceRetention() {
    if (this.versions.length > RUNBOOK_CONFIG.MAX_RETENTION_VERSIONS) {
      const sorted = [...this.versions].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );
      const toRemove = sorted.slice(
        0,
        sorted.length - RUNBOOK_CONFIG.MAX_RETENTION_VERSIONS
      );
      toRemove.forEach((v) => {
        const index = this.versions.findIndex((ver) => ver.id === v.id);
        if (index !== -1) this.versions.splice(index, 1);
      });
    }
  }
}

// ============================================================================
// Approval Workflow
// ============================================================================

class ApprovalWorkflow {
  constructor(runbookId) {
    this.runbookId = runbookId;
    this.approvals = [];
    this.requiredApprovers = [];
    this.status = RUNBOOK_STATUS.DRAFT;
  }

  setRequiredApprovers(approvers) {
    if (!Array.isArray(approvers) || approvers.length === 0) {
      throw new ValidationError('At least one approver is required', 'approvers');
    }

    approvers.forEach((approver) => {
      if (!approver.id || !approver.email || !Utils.validateEmail(approver.email)) {
        throw new ValidationError('Invalid approver data', 'approver');
      }
    });

    this.requiredApprovers = approvers;
  }

  submitForReview(submitter, versionId) {
    if (this.requiredApprovers.length === 0) {
      throw new ApprovalError('No approvers configured for this runbook');
    }

    if (this.status !== RUNBOOK_STATUS.DRAFT && this.status !== RUNBOOK_STATUS.APPROVED) {
      throw new ApprovalError(
        `Cannot submit runbook in status: ${this.status}`
      );
    }

    this.status = RUNBOOK_STATUS.PENDING_REVIEW;
    this.submission = {
      submitter: {
        id: submitter.id,
        name: submitter.name,
        email: submitter.email,
      },
      versionId,
      submittedAt: new Date().toISOString(),
      requiredApprovals: this.requiredApprovers.length,
      approvalsReceived: 0,
    };

    return this.submission;
  }

  approve(approver, versionId, comments = '') {
    return this._recordDecision(
      approver,
      versionId,
      APPROVAL_DECISIONS.APPROVED,
      comments
    );
  }

  reject(approver, versionId, comments = '') {
    if (!comments) {
      throw new ValidationError('Comments required for rejection', 'comments');
    }
    return this._recordDecision(
      approver,
      versionId,
      APPROVAL_DECISIONS.REJECTED,
      comments
    );
  }

  requestChanges(approver, versionId, comments = '') {
    if (!comments) {
      throw new ValidationError(
        'Change requests must include comments',
        'comments'
      );
    }
    return this._recordDecision(
      approver,
      versionId,
      APPROVAL_DECISIONS.CHANGES_REQUESTED,
      comments
    );
  }

  abstain(approver, versionId, comments = '') {
    return this._recordDecision(
      approver,
      versionId,
      APPROVAL_DECISIONS.ABSTAIN,
      comments
    );
  }

  getApprovalStatus() {
    const totalRequired = this.requiredApprovers.length;
    const decisions = this.approvals.filter(
      (a) => a.versionId === this.submission?.versionId
    );

    const approved = decisions.filter(
      (d) => d.decision === APPROVAL_DECISIONS.APPROVED
    ).length;
    const rejected = decisions.filter(
      (d) => d.decision === APPROVAL_DECISIONS.REJECTED
    ).length;
    const changesRequested = decisions.filter(
      (d) => d.decision === APPROVAL_DECISIONS.CHANGES_REQUESTED
    ).length;
    const abstained = decisions.filter(
      (d) => d.decision === APPROVAL_DECISIONS.ABSTAIN
    ).length;

    const pending = totalRequired - approved - rejected - changesRequested - abstained;

    return {
      status: this.status,
      totalRequired,
      approved,
      rejected,
      changesRequested,
      abstained,
      pending: Math.max(0, pending),
      isApproved: approved >= RUNBOOK_CONFIG.APPROVAL_THRESHOLD,
      isRejected: rejected > 0,
      needsChanges: changesRequested > 0,
    };
  }

  _recordDecision(approver, versionId, decision, comments) {
    if (this.status !== RUNBOOK_STATUS.PENDING_REVIEW) {
      throw new ApprovalError(
        `Runbook is not pending review (current: ${this.status})`
      );
    }

    const isRequired = this.requiredApprovers.some((a) => a.id === approver.id);
    if (!isRequired) {
      throw new ApprovalError('User is not a required approver');
    }

    const existingDecision = this.approvals.find(
      (a) => a.approver.id === approver.id && a.versionId === versionId
    );

    if (existingDecision) {
      throw new ApprovalError('Approver has already submitted a decision');
    }

    const approval = {
      id: Utils.generateId(),
      approver: {
        id: approver.id,
        name: approver.name,
        email: approver.email,
      },
      versionId,
      decision,
      comments,
      timestamp: new Date().toISOString(),
    };

    this.approvals.push(approval);

    // Update status based on decisions
    const status = this.getApprovalStatus();
    if (status.isApproved) {
      this.status = RUNBOOK_STATUS.APPROVED;
    } else if (status.isRejected) {
      this.status = RUNBOOK_STATUS.DRAFT;
    } else if (status.needsChanges) {
      this.status = RUNBOOK_STATUS.DRAFT;
    }

    return approval;
  }
}

// ============================================================================
// SLA Tracker
// ============================================================================

class SLATracker {
  constructor() {
    this.findings = [];
    this.alerts = [];
  }

  addFinding(finding) {
    const requiredFields = ['id', 'severity', 'description', 'createdAt'];
    requiredFields.forEach((field) => {
      if (!finding[field]) {
        throw new ValidationError(`Missing required field: ${field}`, field);
      }
    });

    if (!Object.values(SEVERITY_LEVELS).includes(finding.severity)) {
      throw new ValidationError(
        `Invalid severity: ${finding.severity}`,
        'severity'
      );
    }

    const slaInfo = Utils.calculateSLARemaining(
      finding.createdAt,
      finding.severity
    );

    const findingRecord = {
      ...finding,
      sla: slaInfo,
      status: 'open',
      resolvedAt: null,
      resolution: null,
    };

    this.findings.push(findingRecord);

    if (slaInfo.isViolated) {
      this._raiseAlert(findingRecord, 'SLA violation detected');
    }

    return findingRecord;