/**
 * compliance-dashboard/js/scan-viewer.js
 * 
 * ZAP DAST results parser, vulnerability severity filter, and remediation tracking
 * Implements application security practice stack per spec §10.4
 * Maturity target: lender_ready
 * 
 * @owner service:compliance
 * @depends_on [203, 205]
 * @spec_sections ["§10.4"]
 * @blueprint_sections ["§XII"]
 */

'use strict';

// ---------------------------------------------------------------------------
// Constants & Configuration
// ---------------------------------------------------------------------------

const SEVERITY_LEVELS = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
});

const SEVERITY_ORDER = Object.freeze([
  SEVERITY_LEVELS.CRITICAL,
  SEVERITY_LEVELS.HIGH,
  SEVERITY_LEVELS.MEDIUM,
  SEVERITY_LEVELS.LOW,
  SEVERITY_LEVELS.INFO
]);

const SEVERITY_COLORS = Object.freeze({
  [SEVERITY_LEVELS.CRITICAL]: '#c62828',
  [SEVERITY_LEVELS.HIGH]: '#d32f2f',
  [SEVERITY_LEVELS.MEDIUM]: '#f57f17',
  [SEVERITY_LEVELS.LOW]: '#fbc02d',
  [SEVERITY_LEVELS.INFO]: '#1976d2'
});

const REMEDIATION_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  ACCEPTED_RISK: 'accepted_risk',
  FALSE_POSITIVE: 'false_positive'
});

const DEFAULT_CONFIG = Object.freeze({
  apiEndpoint: '/api/v1/scans',
  refreshIntervalMs: 300000, // 5 minutes
  maxAlertsPerScan: 1000,
  enableAutoRefresh: true,
  retryAttempts: 3,
  retryDelayMs: 1000,
  cacheTTLMs: 60000 // 1 minute
});

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

class ScanViewerError extends Error {
  constructor(message, code = 'SCAN_VIEWER_ERROR', details = {}) {
    super(message);
    this.name = 'ScanViewerError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class ParseError extends ScanViewerError {
  constructor(message, rawData = null) {
    super(message, 'PARSE_ERROR', { rawData });
    this.name = 'ParseError';
  }
}

class APIError extends ScanViewerError {
  constructor(message, statusCode = 0, responseBody = null) {
    super(message, 'API_ERROR', { statusCode, responseBody });
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

// ---------------------------------------------------------------------------
// ZAP DAST Result Parser
// ---------------------------------------------------------------------------

class ZAPResultParser {
  /**
   * Parse raw ZAP DAST JSON results into normalized vulnerability objects
   * @param {Object|string} rawData - Raw ZAP API response or JSON string
   * @returns {Array<Object>} Normalized vulnerability alerts
   * @throws {ParseError} If parsing fails
   */
  static parse(rawData) {
    try {
      const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      
      if (!data || !data.alerts || !Array.isArray(data.alerts)) {
        throw new ParseError('Invalid ZAP result format: missing alerts array', data);
      }

      return data.alerts
        .map(alert => ZAPResultParser._normalizeAlert(alert))
        .filter(Boolean);
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(`Failed to parse ZAP results: ${error.message}`, rawData);
    }
  }

  /**
   * Normalize a single ZAP alert to standardized format
   * @param {Object} alert - Raw ZAP alert object
   * @returns {Object|null} Normalized alert or null if invalid
   */
  static _normalizeAlert(alert) {
    if (!alert || !alert.alert || !alert.riskcode) {
      return null;
    }

    const severity = ZAPResultParser._mapRiskCodeToSeverity(alert.riskcode);
    const confidence = ZAPResultParser._parseConfidence(alert.confidence);

    return {
      id: alert.id || ZAPResultParser._generateId(alert),
      name: alert.alert,
      description: alert.description || '',
      severity,
      confidence,
      riskCode: parseInt(alert.riskcode, 10),
      url: alert.url || '',
      parameter: alert.param || '',
      attack: alert.attack || '',
      evidence: alert.evidence || '',
      solution: alert.solution || '',
      reference: alert.reference || '',
      cweId: alert.cweid ? parseInt(alert.cweid, 10) : null,
      wascId: alert.wascid ? parseInt(alert.wascid, 10) : null,
      pluginId: alert.pluginid || null,
      alertRef: alert.alertRef || null,
      tags: alert.tags || {},
      otherInfo: alert.otherinfo || '',
      remediation: {
        status: REMEDIATION_STATUS.OPEN,
        notes: '',
        assignedTo: null,
        resolvedAt: null,
        acceptedRiskJustification: null
      },
      timestamp: new Date().toISOString(),
      source: 'zap_dast',
      metadata: {
        rawRiskCode: alert.riskcode,
        rawConfidence: alert.confidence,
        inputVector: alert.param || null
      }
    };
  }

  /**
   * Map ZAP risk code to standardized severity
   * @param {string|number} riskCode - ZAP risk code (0-3)
   * @returns {string} Normalized severity level
   */
  static _mapRiskCodeToSeverity(riskCode) {
    const code = parseInt(riskCode, 10);
    const severityMap = {
      0: SEVERITY_LEVELS.INFO,
      1: SEVERITY_LEVELS.LOW,
      2: SEVERITY_LEVELS.MEDIUM,
      3: SEVERITY_LEVELS.HIGH
    };
    return severityMap[code] || SEVERITY_LEVELS.INFO;
  }

  /**
   * Parse ZAP confidence value
   * @param {string|number} confidence - ZAP confidence indicator
   * @returns {number} Confidence percentage (0-100)
   */
  static _parseConfidence(confidence) {
    const confidenceMap = {
      '0': 0,    // False Positive
      '1': 25,   // Low
      '2': 50,   // Medium
      '3': 75,   // High
      '4': 100   // Confirmed
    };
    return confidenceMap[String(confidence)] || 50;
  }

  /**
   * Generate unique ID for alert if not provided
   * @param {Object} alert - Raw alert object
   * @returns {string} Generated unique ID
   */
  static _generateId(alert) {
    const hash = [
      alert.alert,
      alert.url,
      alert.param,
      alert.attack
    ].filter(Boolean).join('|');
    
    let id = 0;
    for (let i = 0; i < hash.length; i++) {
      const char = hash.charCodeAt(i);
      id = ((id << 5) - id) + char;
      id |= 0;
    }
    return `zap_${Math.abs(id).toString(16)}_${Date.now()}`;
  }
}

// ---------------------------------------------------------------------------
// Vulnerability Severity Filter
// ---------------------------------------------------------------------------

class SeverityFilter {
  /**
   * @param {Object} [options] - Filter configuration
   * @param {Array<string>} [options.severities] - Allowed severities
   * @param {number} [options.minConfidence] - Minimum confidence threshold (0-100)
   * @param {boolean} [options.includeInfo] - Include informational findings
   */
  constructor(options = {}) {
    this._severities = new Set(options.severities || Object.values(SEVERITY_LEVELS));
    this._minConfidence = Math.max(0, Math.min(100, options.minConfidence || 0));
    this._includeInfo = options.includeInfo !== false;
    this._filters = [];
    this._listeners = new Set();
  }

  /**
   * Apply all active filters to vulnerability array
   * @param {Array<Object>} vulnerabilities - Array of normalized vulnerability objects
   * @returns {Array<Object>} Filtered vulnerabilities
   */
  apply(vulnerabilities) {
    if (!Array.isArray(vulnerabilities)) {
      return [];
    }

    let filtered = vulnerabilities.filter(v => this._passesBaseFilters(v));
    
    for (const filterFn of this._filters) {
      filtered = filtered.filter(filterFn);
    }

    return filtered;
  }

  /**
   * Apply base severity and confidence filters
   * @param {Object} vuln - Vulnerability object
   * @returns {boolean} Whether vulnerability passes base filters
   */
  _passesBaseFilters(vuln) {
    if (!vuln || !vuln.severity) return false;
    
    if (!this._includeInfo && vuln.severity === SEVERITY_LEVELS.INFO) {
      return false;
    }

    if (!this._severities.has(vuln.severity)) {
      return false;
    }

    if ((vuln.confidence || 0) < this._minConfidence) {
      return false;
    }

    return true;
  }

  /**
   * Add custom filter function
   * @param {Function} filterFn - Filter function receiving vulnerability object
   * @returns {Function} Unsubscribe function
   */
  addFilter(filterFn) {
    if (typeof filterFn !== 'function') {
      throw new ScanViewerError('Filter must be a function', 'INVALID_FILTER');
    }

    this._filters.push(filterFn);
    this._notifyListeners();
    
    return () => {
      const index = this._filters.indexOf(filterFn);
      if (index > -1) {
        this._filters.splice(index, 1);
        this._notifyListeners();
      }
    };
  }

  /**
   * Set allowed severities
   * @param {Array<string>} severities - Array of severity levels
   */
  setSeverities(severities) {
    this._severities = new Set(
      severities.filter(s => Object.values(SEVERITY_LEVELS).includes(s))
    );
    this._notifyListeners();
  }

  /**
   * Set minimum confidence threshold
   * @param {number} min - Minimum confidence (0-100)
   */
  setMinConfidence(min) {
    this._minConfidence = Math.max(0, Math.min(100, min));
    this._notifyListeners();
  }

  /**
   * Subscribe to filter changes
   * @param {Function} listener - Callback when filters change
   * @returns {Function} Unsubscribe function
   */
  onChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /** @private */
  _notifyListeners() {
    for (const listener of this._listeners) {
      try {
        listener(this);
      } catch (error) {
        console.error('SeverityFilter listener error:', error);
      }
    }
  }

  /**
   * Get current filter state
   * @returns {Object} Filter state snapshot
   */
  getState() {
    return {
      severities: [...this._severities],
      minConfidence: this._minConfidence,
      includeInfo: this._includeInfo,
      customFiltersCount: this._filters.length
    };
  }

  /**
   * Reset filters to default state
   */
  reset() {
    this._severities = new Set(Object.values(SEVERITY_LEVELS));
    this._minConfidence = 0;
    this._includeInfo = true;
    this._filters = [];
    this._notifyListeners();
  }
}

// ---------------------------------------------------------------------------
// Remediation Tracker
// ---------------------------------------------------------------------------

class RemediationTracker {
  /**
   * @param {Object} [options] - Tracker configuration
   * @param {string} [options.storageKey] - LocalStorage key for persistence
   * @param {Function} [options.onUpdate] - Callback on remediation state changes
   */
  constructor(options = {}) {
    this._storageKey = options.storageKey || 'compliance_remediation_state';
    this._onUpdate = options.onUpdate || null;
    this._remediations = new Map();
    this._loadFromStorage();
  }

  /**
   * Update remediation status for a vulnerability
   * @param {string} vulnId - Vulnerability ID
   * @param {Object} update - Remediation update
   * @param {string} [update.status] - New remediation status
   * @param {string} [update.notes] - Remediation notes
   * @param {string} [update.assignedTo] - Assignee
   * @param {string} [update.acceptedRiskJustification] - Risk acceptance justification
   * @returns {Object} Updated remediation state
   * @throws {ScanViewerError} If update is invalid
   */
  updateRemediation(vulnId, update) {
    if (!vulnId) {
      throw new ScanViewerError('Vulnerability ID is required', 'INVALID_ID');
    }

    const current = this._remediations.get(vulnId) || {
      status: REMEDIATION_STATUS.OPEN,
      notes: '',
      assignedTo: null,
      resolvedAt: null,
      acceptedRiskJustification: null,
      updatedAt: null
    };

    const updated = { ...current };

    if (update.status) {
      if (!Object.values(REMEDIATION_STATUS).includes(update.status)) {
        throw new ScanViewerError(
          `Invalid remediation status: ${update.status}`,
          'INVALID_STATUS'
        );
      }
      updated.status = update.status;
      
      if (update.status === REMEDIATION_STATUS.RESOLVED) {
        updated.resolvedAt = new Date().toISOString();
      } else {
        updated.resolvedAt = null;
      }
    }

    if (update.notes !== undefined) {
      updated.notes = String(update.notes).trim();
    }

    if (update.assignedTo !== undefined) {
      updated.assignedTo = update.assignedTo ? String(update.assignedTo).trim() : null;
    }

    if (update.acceptedRiskJustification !== undefined) {
      if (update.status === REMEDIATION_STATUS.ACCEPTED_RISK && !update.acceptedRiskJustification) {
        throw new ScanViewerError(
          'Accepted risk requires justification',
          'MISSING_JUSTIFICATION'
        );
      }
      updated.acceptedRiskJustification = update.acceptedRiskJustification 
        ? String(update.acceptedRiskJustification).trim() 
        : null;
    }

    updated.updatedAt = new Date().toISOString();
    this._remediations.set(vulnId, updated);
    this._persistToStorage();
    
    if (this._onUpdate) {
      this._onUpdate(vulnId, updated);
    }

    return updated;
  }

  /**
   * Get remediation state for a vulnerability
   * @param {string} vulnId - Vulnerability ID
   * @returns {Object|null} Remediation state or null if not found
   */
  getRemediation(vulnId) {
    return this._remediations.get(vulnId) || null;
  }

  /**
   * Get all remediations with optional status filter
   * @param {string} [status] - Filter by remediation status
   * @returns {Array<Object>} Array of remediation states with vulnerability IDs
   */
  getAllRemediations(status = null) {
    const results = [];
    
    for (const [vulnId, remediation] of this._remediations) {
      if (!status || remediation.status === status) {
        results.push({ vulnId, ...remediation });
      }
    }

    return results;
  }

  /**
   * Get remediation statistics
   * @returns {Object} Remediation statistics
   */
  getStatistics() {
    const stats = {
      total: 0,
      byStatus: {},
      slaCompliance: 0
    };

    for (const remediation of this._remediations.values()) {
      stats.total++;
      stats.byStatus[remediation.status] = (stats.byStatus[remediation.status] || 0) + 1;
    }

    // Calculate SLA compliance (resolved vs total actionable)
    const actionable = stats.total - (stats.byStatus[REMEDIATION_STATUS.FALSE_POSITIVE] || 0);
    const resolved = stats.byStatus[REMEDIATION_STATUS.RESOLVED] || 0;
    stats.slaCompliance = actionable > 0 ? (resolved / actionable) * 100 : 100;

    return stats;
  }

  /**
   * Load remediation state from localStorage
   * @private
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(this._storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data && typeof data === 'object') {
          for (const [key, value] of Object.entries(data)) {
            this._remediations.set(key, value);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load remediation state from storage:', error.message);
    }
  }

  /**
   * Persist remediation state to localStorage
   * @private
   */
  _persistToStorage() {
    try {
      const data = {};
      for (const [key, value] of this._remediations) {
        data[key] = value;
      }
      localStorage.setItem(this._storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to persist remediation state:', error.message);
    }
  }

  /**
   * Clear all remediation state
   */