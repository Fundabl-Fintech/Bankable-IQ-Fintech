/**
 * dependency-manager.js
 * Snyk/Dependabot integration: CVE display, patch status, auto-merge configuration UI
 * 
 * Owner: service:compliance
 * Depends on: [203, 205]
 * Maturity target: lender_ready
 * 
 * Implements application security practice stack per spec §10.4
 * ASVS Level 2 baseline, Level 3 for credit-svc and compliance-svc
 */

'use strict';

const API_BASE_URL = '/api/v1/compliance';
const POLL_INTERVAL_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * @typedef {Object} CVE
 * @property {string} id - CVE identifier
 * @property {string} package_name - Affected package name
 * @property {string} severity - CRITICAL|HIGH|MEDIUM|LOW
 * @property {string} cvss_score - CVSS score
 * @property {string} status - open|patched|mitigated|false_positive
 * @property {string} fix_version - Version with fix
 * @property {string} detected_at - ISO timestamp
 * @property {string} patched_at - ISO timestamp or null
 * @property {string} service - Affected service name
 * @property {string} description - CVE description
 */

/**
 * @typedef {Object} AutoMergeConfig
 * @property {boolean} enabled - Whether auto-merge is enabled
 * @property {string[]} allowed_severities - Severities allowed for auto-merge
 * @property {boolean} require_approval - Require PR approval before merge
 * @property {boolean} notify_on_failure - Send notification on merge failure
 * @property {string[]} excluded_packages - Packages excluded from auto-merge
 */

class DependencyManager {
  constructor(options = {}) {
    this.container = options.container || document.getElementById('dependency-manager');
    if (!this.container) {
      throw new Error('Dependency manager container element not found');
    }

    this.apiBase = options.apiBase || API_BASE_URL;
    this.pollInterval = options.pollInterval || POLL_INTERVAL_MS;
    this.maxRetries = options.maxRetries || MAX_RETRIES;
    this.retryDelay = options.retryDelay || RETRY_DELAY_MS;

    /** @type {CVE[]} */
    this.vulnerabilities = [];
    
    /** @type {AutoMergeConfig} */
    this.autoMergeConfig = {
      enabled: false,
      allowed_severities: ['LOW'],
      require_approval: true,
      notify_on_failure: true,
      excluded_packages: []
    };

    this.pollTimer = null;
    this.isLoading = false;
    this.error = null;

    this.init();
  }

  /**
   * Initialize the dependency manager
   */
  async init() {
    this.render();
    this.attachEventListeners();
    await this.loadInitialData();
    this.startPolling();
  }

  /**
   * Load initial data from APIs
   */
  async loadInitialData() {
    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const [vulnerabilities, config] = await Promise.all([
        this.fetchVulnerabilities(),
        this.fetchAutoMergeConfig()
      ]);

      this.vulnerabilities = vulnerabilities;
      this.autoMergeConfig = { ...this.autoMergeConfig, ...config };
      this.isLoading = false;
      this.render();
    } catch (err) {
      this.error = err.message || 'Failed to load dependency data';
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Fetch vulnerabilities from API with retry logic
   * @returns {Promise<CVE[]>}
   */
  async fetchVulnerabilities() {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiBase}/vulnerabilities`, {
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'same-origin'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return this.normalizeVulnerabilities(data);
      } catch (err) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Normalize vulnerability data from different sources (Snyk/Dependabot)
   * @param {Array} data - Raw vulnerability data
   * @returns {CVE[]}
   */
  normalizeVulnerabilities(data) {
    if (!Array.isArray(data)) {
      console.warn('Invalid vulnerability data format, expected array');
      return [];
    }

    return data.map(item => ({
      id: item.id || item.cve_id || `CVE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      package_name: item.package_name || item.package || 'unknown',
      severity: (item.severity || 'MEDIUM').toUpperCase(),
      cvss_score: item.cvss_score || item.cvss || 'N/A',
      status: item.status || 'open',
      fix_version: item.fix_version || item.patched_version || 'N/A',
      detected_at: item.detected_at || item.created_at || new Date().toISOString(),
      patched_at: item.patched_at || null,
      service: item.service || 'unknown',
      description: item.description || item.title || 'No description available'
    }));
  }

  /**
   * Fetch auto-merge configuration
   * @returns {Promise<Partial<AutoMergeConfig>>}
   */
  async fetchAutoMergeConfig() {
    try {
      const response = await fetch(`${this.apiBase}/auto-merge-config`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('Failed to fetch auto-merge config, using defaults:', err.message);
      return {};
    }
  }

  /**
   * Update auto-merge configuration
   * @param {Partial<AutoMergeConfig>} config - Configuration updates
   * @returns {Promise<boolean>}
   */
  async updateAutoMergeConfig(config) {
    try {
      const response = await fetch(`${this.apiBase}/auto-merge-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const updatedConfig = await response.json();
      this.autoMergeConfig = { ...this.autoMergeConfig, ...updatedConfig };
      this.render();
      return true;
    } catch (err) {
      this.showNotification('Failed to update auto-merge configuration', 'error');
      console.error('Auto-merge config update failed:', err);
      return false;
    }
  }

  /**
   * Start polling for updates
   */
  startPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = setInterval(async () => {
      try {
        const vulnerabilities = await this.fetchVulnerabilities();
        this.vulnerabilities = vulnerabilities;
        this.renderVulnerabilityTable();
      } catch (err) {
        console.warn('Polling failed:', err.message);
      }
    }, this.pollInterval);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Attach event listeners to the UI
   */
  attachEventListeners() {
    // Auto-merge toggle
    const toggle = this.container.querySelector('#auto-merge-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        this.updateAutoMergeConfig({ enabled: e.target.checked });
      });
    }

    // Severity filter
    const severityFilter = this.container.querySelector('#severity-filter');
    if (severityFilter) {
      severityFilter.addEventListener('change', () => {
        this.renderVulnerabilityTable();
      });
    }

    // Service filter
    const serviceFilter = this.container.querySelector('#service-filter');
    if (serviceFilter) {
      serviceFilter.addEventListener('change', () => {
        this.renderVulnerabilityTable();
      });
    }

    // Refresh button
    const refreshBtn = this.container.querySelector('#refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadInitialData();
      });
    }

    // Auto-merge severity checkboxes
    const severityCheckboxes = this.container.querySelectorAll('.severity-checkbox');
    severityCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const severity = e.target.value;
        const allowed = this.autoMergeConfig.allowed_severities;
        
        if (e.target.checked && !allowed.includes(severity)) {
          allowed.push(severity);
        } else if (!e.target.checked) {
          const index = allowed.indexOf(severity);
          if (index > -1) {
            allowed.splice(index, 1);
          }
        }

        this.updateAutoMergeConfig({ allowed_severities: allowed });
      });
    });

    // Require approval toggle
    const requireApproval = this.container.querySelector('#require-approval');
    if (requireApproval) {
      requireApproval.addEventListener('change', (e) => {
        this.updateAutoMergeConfig({ require_approval: e.target.checked });
      });
    }

    // Notify on failure toggle
    const notifyFailure = this.container.querySelector('#notify-failure');
    if (notifyFailure) {
      notifyFailure.addEventListener('change', (e) => {
        this.updateAutoMergeConfig({ notify_on_failure: e.target.checked });
      });
    }

    // Excluded packages input
    const excludedPackages = this.container.querySelector('#excluded-packages');
    if (excludedPackages) {
      excludedPackages.addEventListener('change', (e) => {
        const packages = e.target.value.split(',').map(p => p.trim()).filter(Boolean);
        this.updateAutoMergeConfig({ excluded_packages: packages });
      });
    }
  }

  /**
   * Render the entire dependency manager UI
   */
  render() {
    this.container.innerHTML = `
      <div class="dependency-manager">
        <div class="dm-header">
          <h2 class="dm-title">Dependency Security Manager</h2>
          <div class="dm-header-actions">
            <button id="refresh-btn" class="dm-btn dm-btn-secondary" ${this.isLoading ? 'disabled' : ''}>
              ${this.isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <span class="dm-status ${this.error ? 'dm-status-error' : 'dm-status-ok'}">
              ${this.error ? 'Error' : 'Connected'}
            </span>
          </div>
        </div>

        ${this.error ? this.renderError() : ''}
        ${this.isLoading ? this.renderLoading() : ''}

        <div class="dm-content">
          <div class="dm-section">
            <h3 class="dm-section-title">Vulnerability Overview</h3>
            ${this.renderSummaryCards()}
            ${this.renderFilters()}
            ${this.renderVulnerabilityTable()}
          </div>

          <div class="dm-section">
            <h3 class="dm-section-title">Auto-Merge Configuration</h3>
            ${this.renderAutoMergeConfig()}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Render error message
   * @returns {string}
   */
  renderError() {
    return `
      <div class="dm-alert dm-alert-error">
        <span class="dm-alert-icon">⚠</span>
        <span class="dm-alert-message">${this.escapeHtml(this.error)}</span>
        <button class="dm-alert-close" onclick="this.parentElement.remove()">×</button>
      </div>
    `;
  }

  /**
   * Render loading state
   * @returns {string}
   */
  renderLoading() {
    return `
      <div class="dm-loading">
        <div class="dm-spinner"></div>
        <span>Loading dependency data...</span>
      </div>
    `;
  }

  /**
   * Render summary cards
   * @returns {string}
   */
  renderSummaryCards() {
    const counts = {
      critical: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      high: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
      medium: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
      low: this.vulnerabilities.filter(v => v.severity === 'LOW').length,
      open: this.vulnerabilities.filter(v => v.status === 'open').length,
      patched: this.vulnerabilities.filter(v => v.status === 'patched').length
    };

    return `
      <div class="dm-summary-cards">
        <div class="dm-card dm-card-critical">
          <div class="dm-card-value">${counts.critical}</div>
          <div class="dm-card-label">Critical</div>
        </div>
        <div class="dm-card dm-card-high">
          <div class="dm-card-value">${counts.high}</div>
          <div class="dm-card-label">High</div>
        </div>
        <div class="dm-card dm-card-medium">
          <div class="dm-card-value">${counts.medium}</div>
          <div class="dm-card-label">Medium</div>
        </div>
        <div class="dm-card dm-card-low">
          <div class="dm-card-value">${counts.low}</div>
          <div class="dm-card-label">Low</div>
        </div>
        <div class="dm-card dm-card-open">
          <div class="dm-card-value">${counts.open}</div>
          <div class="dm-card-label">Open</div>
        </div>
        <div class="dm-card dm-card-patched">
          <div class="dm-card-value">${counts.patched}</div>
          <div class="dm-card-label">Patched</div>
        </div>
      </div>
    `;
  }

  /**
   * Render filter controls
   * @returns {string}
   */
  renderFilters() {
    const services = [...new Set(this.vulnerabilities.map(v => v.service))];
    const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    return `
      <div class="dm-filters">
        <div class="dm-filter-group">
          <label for="severity-filter">Severity:</label>
          <select id="severity-filter" class="dm-select">
            <option value="all">All Severities</option>
            ${severities.map(s => `<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
        <div class="dm-filter-group">
          <label for="service-filter">Service:</label>
          <select id="service-filter" class="dm-select">
            <option value="all">All Services</option>
            ${services.map(s => `<option value="${s}">${this.escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  }

  /**
   * Render vulnerability table
   * @returns {string}
   */
  renderVulnerabilityTable() {
    const severityFilter = this.container.querySelector('#severity-filter')?.value || 'all';
    const serviceFilter = this.container.querySelector('#service-filter')?.value || 'all';

    let filtered = this.vulnerabilities;

    if (severityFilter !== 'all') {
      filtered = filtered.filter(v => v.severity === severityFilter);
    }

    if (serviceFilter !== 'all') {
      filtered = filtered.filter(v => v.service === serviceFilter);
    }

    if (filtered.length === 0) {
      return '<div class="dm-empty">No vulnerabilities found</div>';
    }

    return `
      <div class="dm-table-container">
        <table class="dm-table">
          <thead>
            <tr>
              <th>CVE ID</th>
              <th>Package</th>
              <th>Severity</th>
              <th>CVSS</th>
              <th>Status</th>
              <th>Fix Version</th>
              <th>Service</th>
              <th>Detected</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(v => this.renderVulnerabilityRow(v)).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render a single vulnerability row
   * @param {CVE} vulnerability
   * @returns {string}
   */
  renderVulnerabilityRow(vulnerability) {
    const severityClass = vulnerability.severity.toLowerCase();
    const statusClass = vulnerability.status.replace(/\s+/g, '-');
    const isPatchable = vulnerability.fix_version && vulnerability.fix_version !== 'N/A';

    return `
      <tr class="dm-row-${severityClass}">
        <td class="dm-cell-id">
          <a href="https://cve.mitre.org/cgi-bin/cvename.cgi?name=${vulnerability.id}" 
             target="_blank" rel="noopener noreferrer">
            ${this.escapeHtml(vulnerability.id)}
          </a>
        </td>
        <td class="dm-cell-package">${this.escapeHtml(vulnerability.package_name)}</td>
        <td class="dm-cell-severity">
          <span class="dm-badge dm-badge-