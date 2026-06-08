/**
 * Security Dashboard - Main Application Logic
 * Owner: platform
 * Dependencies: [1345, 1357]
 * Spec: §10.4 - Application Security Practice Stack
 * Maturity Target: foundation
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Configuration & Constants
  // ---------------------------------------------------------------------------

  const CONFIG = {
    apiBaseUrl: '/api/v1/security',
    refreshInterval: 30000, // 30 seconds
    chartDefaults: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
    },
    statusColors: {
      success: '#0f9d58',
      warning: '#f4b400',
      danger: '#ea4335',
      neutral: '#5f6368',
      primary: '#1a73e8',
    },
    endpoints: {
      vulnerabilities: '/vulnerabilities',
      scanResults: '/scans',
      compliance: '/compliance',
      secrets: '/secrets',
      metrics: '/metrics',
      status: '/status',
    },
  };

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------

  const state = {
    charts: {},
    data: {
      vulnerabilities: [],
      scans: [],
      compliance: [],
      secrets: [],
      metrics: {},
    },
    intervals: [],
    isInitialized: false,
  };

  // ---------------------------------------------------------------------------
  // Utility Functions
  // ---------------------------------------------------------------------------

  const utils = {
    /**
     * Safely query the DOM for an element
     * @param {string} selector - CSS selector
     * @param {Element} [context=document] - Context element
     * @returns {Element|null}
     */
    $(selector, context = document) {
      try {
        return context.querySelector(selector);
      } catch {
        return null;
      }
    },

    /**
     * Safely query the DOM for multiple elements
     * @param {string} selector - CSS selector
     * @param {Element} [context=document] - Context element
     * @returns {NodeList}
     */
    $$(selector, context = document) {
      try {
        return context.querySelectorAll(selector);
      } catch {
        return [];
      }
    },

    /**
     * Create an element with attributes and children
     * @param {string} tag - HTML tag
     * @param {Object} [attrs={}] - Attributes
     * @param {Array|string} [children=[]] - Child elements or text
     * @returns {Element}
     */
    createElement(tag, attrs = {}, children = []) {
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([key, value]) => {
        if (key === 'className') {
          el.className = value;
        } else if (key === 'dataset') {
          Object.assign(el.dataset, value);
        } else if (key.startsWith('on')) {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else {
          el.setAttribute(key, value);
        }
      });
      if (typeof children === 'string') {
        el.textContent = children;
      } else {
        children.forEach((child) => {
          if (child instanceof Node) {
            el.appendChild(child);
          } else if (typeof child === 'string') {
            el.appendChild(document.createTextNode(child));
          }
        });
      }
      return el;
    },

    /**
     * Format a date string for display
     * @param {string|Date} date - Date to format
     * @returns {string}
     */
    formatDate(date) {
      try {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return 'Invalid date';
      }
    },

    /**
     * Format a number with commas
     * @param {number} num - Number to format
     * @returns {string}
     */
    formatNumber(num) {
      try {
        return Number(num).toLocaleString('en-US');
      } catch {
        return '0';
      }
    },

    /**
     * Debounce a function
     * @param {Function} fn - Function to debounce
     * @param {number} delay - Delay in ms
     * @returns {Function}
     */
    debounce(fn, delay) {
      let timeoutId;
      return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /**
     * Sanitize a string for safe DOM insertion
     * @param {string} str - String to sanitize
     * @returns {string}
     */
    sanitize(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    },

    /**
     * Get severity color based on level
     * @param {string} severity - Severity level
     * @returns {string}
     */
    getSeverityColor(severity) {
      const map = {
        critical: CONFIG.statusColors.danger,
        high: '#e37400',
        medium: CONFIG.statusColors.warning,
        low: CONFIG.statusColors.success,
        info: CONFIG.statusColors.neutral,
      };
      return map[severity?.toLowerCase()] || CONFIG.statusColors.neutral;
    },
  };

  // ---------------------------------------------------------------------------
  // API Client
  // ---------------------------------------------------------------------------

  const api = {
    /**
     * Generic fetch wrapper with error handling
     * @param {string} endpoint - API endpoint
     * @param {Object} [options={}] - Fetch options
     * @returns {Promise<Object>}
     */
    async request(endpoint, options = {}) {
      const url = `${CONFIG.apiBaseUrl}${endpoint}`;
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };

      try {
        const response = await fetch(url, {
          ...options,
          headers: { ...defaultHeaders, ...options.headers },
          credentials: 'same-origin',
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(
            `API Error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`
          );
        }

        return await response.json();
      } catch (error) {
        console.error(`[Dashboard API] Request failed: ${endpoint}`, error);
        throw error;
      }
    },

    /**
     * Fetch vulnerabilities data
     * @returns {Promise<Array>}
     */
    async getVulnerabilities() {
      return this.request(CONFIG.endpoints.vulnerabilities);
    },

    /**
     * Fetch scan results
     * @returns {Promise<Array>}
     */
    async getScanResults() {
      return this.request(CONFIG.endpoints.scanResults);
    },

    /**
     * Fetch compliance status
     * @returns {Promise<Array>}
     */
    async getCompliance() {
      return this.request(CONFIG.endpoints.compliance);
    },

    /**
     * Fetch secret scan alerts
     * @returns {Promise<Array>}
     */
    async getSecrets() {
      return this.request(CONFIG.endpoints.secrets);
    },

    /**
     * Fetch dashboard metrics
     * @returns {Promise<Object>}
     */
    async getMetrics() {
      return this.request(CONFIG.endpoints.metrics);
    },

    /**
     * Fetch overall system status
     * @returns {Promise<Object>}
     */
    async getStatus() {
      return this.request(CONFIG.endpoints.status);
    },
  };

  // ---------------------------------------------------------------------------
  // Chart Management (Chart.js wrapper)
  // ---------------------------------------------------------------------------

  const chartManager = {
    /**
     * Initialize a chart on a canvas element
     * @param {string} canvasId - Canvas element ID
     * @param {string} type - Chart type
     * @param {Object} data - Chart data
     * @param {Object} [options={}] - Chart options
     * @returns {Chart|null}
     */
    create(canvasId, type, data, options = {}) {
      const canvas = utils.$(`#${canvasId}`);
      if (!canvas) {
        console.warn(`[ChartManager] Canvas not found: #${canvasId}`);
        return null;
      }

      // Destroy existing chart if it exists
      this.destroy(canvasId);

      try {
        const chart = new Chart(canvas.getContext('2d'), {
          type,
          data,
          options: {
            ...CONFIG.chartDefaults,
            ...options,
          },
        });

        state.charts[canvasId] = chart;
        return chart;
      } catch (error) {
        console.error(`[ChartManager] Failed to create chart: ${canvasId}`, error);
        return null;
      }
    },

    /**
     * Destroy a chart by canvas ID
     * @param {string} canvasId - Canvas element ID
     */
    destroy(canvasId) {
      if (state.charts[canvasId]) {
        try {
          state.charts[canvasId].destroy();
        } catch (error) {
          console.warn(`[ChartManager] Error destroying chart: ${canvasId}`, error);
        }
        delete state.charts[canvasId];
      }
    },

    /**
     * Update an existing chart's data
     * @param {string} canvasId - Canvas element ID
     * @param {Object} data - New chart data
     */
    update(canvasId, data) {
      if (state.charts[canvasId]) {
        try {
          state.charts[canvasId].data = data;
          state.charts[canvasId].update('none');
        } catch (error) {
          console.error(`[ChartManager] Failed to update chart: ${canvasId}`, error);
        }
      }
    },

    /**
     * Create a vulnerability severity distribution chart
     * @param {Array} vulnerabilities - Vulnerability data
     */
    renderVulnerabilityChart(vulnerabilities) {
      const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
      vulnerabilities.forEach((vuln) => {
        const severity = (vuln.severity || 'info').toLowerCase();
        if (severityCounts.hasOwnProperty(severity)) {
          severityCounts[severity]++;
        }
      });

      const data = {
        labels: Object.keys(severityCounts).map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
        datasets: [
          {
            label: 'Vulnerabilities by Severity',
            data: Object.values(severityCounts),
            backgroundColor: [
              CONFIG.statusColors.danger,
              '#e37400',
              CONFIG.statusColors.warning,
              CONFIG.statusColors.success,
              CONFIG.statusColors.neutral,
            ],
            borderWidth: 1,
          },
        ],
      };

      this.create('vulnerabilityChart', 'doughnut', data, {
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed} vulnerabilities`,
            },
          },
        },
      });
    },

    /**
     * Create a scan results timeline chart
     * @param {Array} scans - Scan data
     */
    renderScanTimelineChart(scans) {
      const sortedScans = [...scans]
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-20);

      const data = {
        labels: sortedScans.map((s) => utils.formatDate(s.timestamp)),
        datasets: [
          {
            label: 'Critical',
            data: sortedScans.map((s) => s.critical || 0),
            backgroundColor: CONFIG.statusColors.danger,
            borderColor: CONFIG.statusColors.danger,
            borderWidth: 1,
          },
          {
            label: 'High',
            data: sortedScans.map((s) => s.high || 0),
            backgroundColor: '#e37400',
            borderColor: '#e37400',
            borderWidth: 1,
          },
          {
            label: 'Medium',
            data: sortedScans.map((s) => s.medium || 0),
            backgroundColor: CONFIG.statusColors.warning,
            borderColor: CONFIG.statusColors.warning,
            borderWidth: 1,
          },
        ],
      };

      this.create('scanTimelineChart', 'bar', data, {
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true },
        },
        plugins: {
          legend: { position: 'top' },
        },
      });
    },

    /**
     * Create a compliance status chart
     * @param {Array} compliance - Compliance data
     */
    renderComplianceChart(compliance) {
      const passed = compliance.filter((c) => c.status === 'passed').length;
      const failed = compliance.filter((c) => c.status === 'failed').length;
      const pending = compliance.filter((c) => c.status === 'pending').length;

      const data = {
        labels: ['Passed', 'Failed', 'Pending'],
        datasets: [
          {
            label: 'Compliance Checks',
            data: [passed, failed, pending],
            backgroundColor: [
              CONFIG.statusColors.success,
              CONFIG.statusColors.danger,
              CONFIG.statusColors.warning,
            ],
            borderWidth: 1,
          },
        ],
      };

      this.create('complianceChart', 'pie', data, {
        plugins: {
          legend: { position: 'bottom' },
        },
      });
    },
  };

  // ---------------------------------------------------------------------------
  // UI Component Builders
  // ---------------------------------------------------------------------------

  const ui = {
    /**
     * Create a security status badge
     * @param {string} status - Status type
     * @param {string} label - Display label
     * @returns {Element}
     */
    createStatusBadge(status, label) {
      const colors = {
        secure: CONFIG.statusColors.success,
        warning: CONFIG.statusColors.warning,
        critical: CONFIG.statusColors.danger,
        unknown: CONFIG.statusColors.neutral,
      };

      const badge = utils.createElement('span', {
        className: `security-status-badge status-${status}`,
        role: 'status',
        'aria-label': `Security status: ${label}`,
      });

      const indicator = utils.createElement('span', {
        className: 'status-indicator',
        style: `background-color: ${colors[status] || colors.unknown}`,
      });

      const text = utils.createElement('span', {
        className: 'status-label',
      }, utils.sanitize(label));

      badge.appendChild(indicator);
      badge.appendChild(text);
      return badge;
    },

    /**
     * Create a vulnerability table row
     * @param {Object} vuln - Vulnerability data
     * @returns {Element}
     */
    createVulnerabilityRow(vuln) {
      const row = utils.createElement('tr', {
        className: `vulnerability-row severity-${(vuln.severity || 'info').toLowerCase()}`,
        dataset: { vulnId: vuln.id },
      });

      const severityColor = utils.getSeverityColor(vuln.severity);
      const severityBadge = utils.createElement('span', {
        className: 'severity-badge',
        style: `background-color: ${severityColor}; color: white; padding: 2px 8px; border-radius: 4px;`,
      }, utils.sanitize(vuln.severity || 'Unknown'));

      row.innerHTML = `
        <td>${utils.sanitize(vuln.id || '')}</td>
        <td>${severityBadge.outerHTML}</td>
        <td>${utils.sanitize(vuln.title || '')}</td>
        <td>${utils.sanitize(vuln.package || 'N/A')}</td>
        <td>${utils.sanitize(vuln.version || 'N/A')}</td>
        <td>${utils.formatDate(vuln.discovered_at)}</td>
        <td>${utils.sanitize(vuln.status || 'open')}</td>
      `;

      return row;
    },

    /**
     * Create a metric card
     * @param {string} title - Card title
     * @param {string|number} value - Metric value
     * @param {string} [status='neutral'] - Status indicator
     * @param {string} [icon=''] - Icon class
     * @returns {Element}
     */
    createMetricCard(title, value, status = 'neutral', icon = '') {
      const card = utils.createElement('div', {
        className: `dashboard-metric-card metric-${status}`,
        role: 'region',
        'aria-label': `${title}: ${value}`,
      });

      const colors = {
        success: CONFIG.statusColors.success,
        warning: CONFIG.statusColors.warning,
        danger: CONFIG.statusColors.danger,
        neutral: CONFIG.statusColors.neutral,
      };

      card.innerHTML = `
        <div class="metric-header">
          ${icon ? `<span class="metric-icon">${utils.sanitize(icon)}</span>` : ''}
          <h3 class="metric-title">${utils.sanitize(title)}</h3>
        </div>
        <div class="metric-value" style="color: ${colors[status] || colors.neutral}">
          ${utils.sanitize(String(value))}
        </div>
      `;

      return card;
    },

    /**
     * Create a scan result card
     * @param {Object} scan - Scan data
     * @returns {Element}
     */
    createScanResultCard(scan) {
      const statusColor = scan.status === 'completed'
        ? CONFIG.statusColors.success
        : scan.status === 'running'
          ? CONFIG.statusColors.warning
          : CONFIG.statusColors.danger;

      const card = utils.createElement('div', {
        className: `scan-result-card scan-${scan.status}`,
        dataset: { scanId: scan.id },
      });

      card.innerHTML = `
        <div class="scan-header">
          <span class="scan-type">${utils.sanitize(scan.type || 'Unknown')}</span>
          <span class