/**
 * compliance-dashboard/js/security-dashboard.js
 * 
 * Dashboard widget logic: ASVS level indicators, scan status polling, alert aggregation
 * Implements application security practice stack per spec §10.4
 * 
 * @owner service:compliance
 * @depends_on [203, 205]
 * @maturity_target lender_ready
 */

'use strict';

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = Object.freeze({
  // API endpoints
  API_BASE: '/api/v1/security',
  ENDPOINTS: {
    ASVS_STATUS: '/asvs/status',
    SCAN_STATUS: '/scans/status',
    ALERTS: '/alerts',
    METRICS: '/metrics/summary'
  },
  
  // Polling intervals (ms)
  POLLING: {
    SCAN_STATUS: 30000,    // 30 seconds
    ALERTS: 15000,         // 15 seconds
    METRICS: 60000         // 60 seconds
  },
  
  // ASVS levels
  ASVS: {
    LEVEL_2: 'L2',
    LEVEL_3: 'L3',
    ELEVATED_SERVICES: ['compliance-svc', 'credit-svc']
  },
  
  // Severity levels
  SEVERITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info'
  },
  
  // Status indicators
  STATUS: {
    PASS: 'pass',
    FAIL: 'fail',
    WARNING: 'warning',
    PENDING: 'pending',
    ERROR: 'error'
  },
  
  // Color palette from design system
  COLORS: {
    primary: '#1a237e',
    secondary: '#0d47a1',
    success: '#2e7d32',
    warning: '#f57f17',
    danger: '#c62828',
    neutral: '#37474f',
    background: '#f5f5f5'
  },
  
  // Remediation SLAs (hours)
  SLA: {
    CRITICAL: 4,
    HIGH: 24,
    MEDIUM: 72,
    LOW: 168,    // 7 days
    INFO: 720    // 30 days
  }
});

// ─── State Management ────────────────────────────────────────────────────────
class DashboardState {
  constructor() {
    this._state = {
      asvsStatus: null,
      scanStatus: null,
      alerts: [],
      metrics: null,
      pollingTimers: new Map(),
      listeners: new Map()
    };
  }
  
  get(key) {
    return this._state[key];
  }
  
  set(key, value) {
    const oldValue = this._state[key];
    this._state[key] = value;
    this._notify(key, value, oldValue);
  }
  
  subscribe(key, callback) {
    if (!this._state.listeners.has(key)) {
      this._state.listeners.set(key, new Set());
    }
    this._state.listeners.get(key).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this._state.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }
  
  _notify(key, newValue, oldValue) {
    const listeners = this._state.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error(`Error in state listener for ${key}:`, error);
        }
      });
    }
  }
  
  destroy() {
    // Clear all polling timers
    this._state.pollingTimers.forEach((timerId, key) => {
      clearInterval(timerId);
    });
    this._state.pollingTimers.clear();
    this._state.listeners.clear();
  }
}

// ─── API Client ──────────────────────────────────────────────────────────────
class SecurityApiClient {
  constructor(baseUrl = CONFIG.API_BASE) {
    this._baseUrl = baseUrl;
    this._abortControllers = new Map();
  }
  
  async _request(endpoint, options = {}) {
    const url = `${this._baseUrl}${endpoint}`;
    const controller = new AbortController();
    const requestId = `${endpoint}_${Date.now()}`;
    
    this._abortControllers.set(requestId, controller);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        throw new ApiError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          endpoint
        );
      }
      
      return await response.json();
    } finally {
      this._abortControllers.delete(requestId);
    }
  }
  
  async getAsvsStatus() {
    return this._request(CONFIG.ENDPOINTS.ASVS_STATUS);
  }
  
  async getScanStatus() {
    return this._request(CONFIG.ENDPOINTS.SCAN_STATUS);
  }
  
  async getAlerts(params = {}) {
    const queryString = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    const endpoint = queryString 
      ? `${CONFIG.ENDPOINTS.ALERTS}?${queryString}`
      : CONFIG.ENDPOINTS.ALERTS;
    
    return this._request(endpoint);
  }
  
  async getMetrics() {
    return this._request(CONFIG.ENDPOINTS.METRICS);
  }
  
  cancelAllRequests() {
    this._abortControllers.forEach(controller => {
      controller.abort();
    });
    this._abortControllers.clear();
  }
}

class ApiError extends Error {
  constructor(message, statusCode, endpoint) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.timestamp = new Date().toISOString();
  }
}

// ─── ASVS Level Indicator ────────────────────────────────────────────────────
class AsvsLevelIndicator {
  constructor(containerId, state, apiClient) {
    this._container = document.getElementById(containerId);
    this._state = state;
    this._api = apiClient;
    
    if (!this._container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    
    this._init();
  }
  
  async _init() {
    try {
      const status = await this._api.getAsvsStatus();
      this._state.set('asvsStatus', status);
      this._render(status);
    } catch (error) {
      this._renderError(error);
    }
    
    // Subscribe to state changes
    this._state.subscribe('asvsStatus', (status) => {
      this._render(status);
    });
  }
  
  _render(status) {
    if (!status) return;
    
    const { services, overall } = status;
    
    this._container.innerHTML = `
      <div class="asvs-dashboard">
        <div class="asvs-header">
          <h3 class="asvs-title">ASVS Compliance Status</h3>
          <span class="asvs-badge ${this._getBadgeClass(overall)}">
            ${overall.level} - ${overall.status}
          </span>
        </div>
        <div class="asvs-services">
          ${services.map(service => this._renderServiceCard(service)).join('')}
        </div>
      </div>
    `;
  }
  
  _renderServiceCard(service) {
    const isElevated = CONFIG.ASVS.ELEVATED_SERVICES.includes(service.name);
    const targetLevel = isElevated ? CONFIG.ASVS.LEVEL_3 : CONFIG.ASVS.LEVEL_2;
    
    return `
      <div class="service-card ${this._getStatusClass(service.status)}">
        <div class="service-header">
          <span class="service-name">${service.name}</span>
          ${isElevated ? '<span class="elevated-badge">Level 3</span>' : ''}
        </div>
        <div class="service-details">
          <div class="detail-item">
            <span class="detail-label">Target Level</span>
            <span class="detail-value">${targetLevel}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Current Level</span>
            <span class="detail-value">${service.currentLevel}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Compliance</span>
            <span class="detail-value">${service.compliancePercentage}%</span>
          </div>
        </div>
        <div class="service-controls">
          ${this._renderControlList(service.controls)}
        </div>
      </div>
    `;
  }
  
  _renderControlList(controls) {
    if (!controls || controls.length === 0) {
      return '<p class="no-controls">No controls mapped</p>';
    }
    
    return `
      <ul class="control-list">
        ${controls.map(control => `
          <li class="control-item ${this._getStatusClass(control.status)}">
            <span class="control-name">${control.name}</span>
            <span class="control-status">${control.status}</span>
          </li>
        `).join('')}
      </ul>
    `;
  }
  
  _getBadgeClass(overall) {
    if (!overall) return 'badge-pending';
    return overall.status === CONFIG.STATUS.PASS ? 'badge-pass' : 'badge-fail';
  }
  
  _getStatusClass(status) {
    const statusMap = {
      [CONFIG.STATUS.PASS]: 'status-pass',
      [CONFIG.STATUS.FAIL]: 'status-fail',
      [CONFIG.STATUS.WARNING]: 'status-warning',
      [CONFIG.STATUS.PENDING]: 'status-pending',
      [CONFIG.STATUS.ERROR]: 'status-error'
    };
    return statusMap[status] || 'status-unknown';
  }
  
  _renderError(error) {
    this._container.innerHTML = `
      <div class="asvs-error">
        <h3>ASVS Status Unavailable</h3>
        <p>${error.message}</p>
        <button class="retry-button" onclick="this._retry()">Retry</button>
      </div>
    `;
  }
  
  async _retry() {
    try {
      const status = await this._api.getAsvsStatus();
      this._state.set('asvsStatus', status);
    } catch (error) {
      this._renderError(error);
    }
  }
}

// ─── Scan Status Poller ──────────────────────────────────────────────────────
class ScanStatusPoller {
  constructor(containerId, state, apiClient) {
    this._container = document.getElementById(containerId);
    this._state = state;
    this._api = apiClient;
    this._timerId = null;
    this._isPolling = false;
    
    if (!this._container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    
    this._init();
  }
  
  async _init() {
    await this._fetchAndRender();
    this._startPolling();
    
    // Subscribe to state changes
    this._state.subscribe('scanStatus', (status) => {
      this._render(status);
    });
  }
  
  async _fetchAndRender() {
    try {
      const status = await this._api.getScanStatus();
      this._state.set('scanStatus', status);
    } catch (error) {
      console.error('Failed to fetch scan status:', error);
    }
  }
  
  _startPolling() {
    if (this._isPolling) return;
    
    this._isPolling = true;
    this._timerId = setInterval(() => {
      this._fetchAndRender();
    }, CONFIG.POLLING.SCAN_STATUS);
  }
  
  stopPolling() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this._isPolling = false;
  }
  
  _render(status) {
    if (!status) {
      this._container.innerHTML = '<div class="scan-status-loading">Loading scan status...</div>';
      return;
    }
    
    const { scans, lastUpdated } = status;
    
    this._container.innerHTML = `
      <div class="scan-dashboard">
        <div class="scan-header">
          <h3>Security Scan Status</h3>
          <span class="last-updated">Last updated: ${this._formatTimestamp(lastUpdated)}</span>
        </div>
        <div class="scan-grid">
          ${scans.map(scan => this._renderScanCard(scan)).join('')}
        </div>
      </div>
    `;
  }
  
  _renderScanCard(scan) {
    const statusClass = this._getScanStatusClass(scan);
    const timeRemaining = this._calculateTimeRemaining(scan);
    
    return `
      <div class="scan-card ${statusClass}">
        <div class="scan-type">
          <span class="scan-icon">${this._getScanIcon(scan.type)}</span>
          <span class="scan-name">${scan.name}</span>
        </div>
        <div class="scan-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${scan.progress}%"></div>
          </div>
          <span class="progress-text">${scan.progress}%</span>
        </div>
        <div class="scan-details">
          <span class="scan-status">${scan.status}</span>
          ${timeRemaining ? `<span class="scan-time">${timeRemaining}</span>` : ''}
        </div>
        <div class="scan-meta">
          <span class="scan-tool">${scan.tool}</span>
          <span class="scan-findings">${scan.findings} findings</span>
        </div>
      </div>
    `;
  }
  
  _getScanStatusClass(scan) {
    if (scan.status === 'running') return 'scan-running';
    if (scan.status === 'completed') return scan.hasFindings ? 'scan-has-findings' : 'scan-clean';
    if (scan.status === 'failed') return 'scan-failed';
    if (scan.status === 'scheduled') return 'scan-scheduled';
    return 'scan-unknown';
  }
  
  _getScanIcon(type) {
    const icons = {
      'dast': '🛡️',
      'sast': '🔍',
      'sca': '📦',
      'secret': '🔑',
      'dependency': '🔗'
    };
    return icons[type] || '📋';
  }
  
  _calculateTimeRemaining(scan) {
    if (scan.status !== 'running' || !scan.estimatedCompletion) return null;
    
    const now = Date.now();
    const estimated = new Date(scan.estimatedCompletion).getTime();
    const remaining = estimated - now;
    
    if (remaining <= 0) return 'Any moment now';
    
    const minutes = Math.ceil(remaining / 60000);
    if (minutes < 60) return `~${minutes} min remaining`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `~${hours}h ${mins}m remaining`;
  }
  
  _formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}

// ─── Alert Aggregator ────────────────────────────────────────────────────────
class AlertAggregator {
  constructor(containerId, state, apiClient) {
    this._container = document.getElementById(containerId);
    this._state = state;
    this._api = apiClient;
    this._timerId = null;
    this._isPolling = false;
    this._filter = {
      severity: null,
      status: null,
      source: null
    };
    
    if (!this._container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    
    this._init();
  }
  
  async _init() {
    await this._fetchAndRender();
    this._startPolling();
    
    // Subscribe to state changes
    this._state.subscribe('alerts', (alerts) => {
      this._render(alerts);
    });
  }
  
  async _fetchAndRender() {
    try {
      const alerts = await this._api.getAlerts(this._filter);
      this._state.set('alerts', alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  }
  
  _startPolling() {
    if (this._isPolling) return;
    
    this._isPolling = true;
    this._timerId = setInterval(() => {
      this._fetchAndRender();
    }, CONFIG.POLLING.ALERTS);
  }
  
  stopPolling() {
    if (this._timerId) {
      clearInterval(this._timerId);
      this._timerId = null;
    }
    this._isPolling = false;
  }
  
  setFilter(filter) {
    this._filter = { ...this._filter, ...filter };
    this._fetchAndRender();
  }
  
  _render(alerts) {
    if (!alerts || !alerts.items) {
      this._container.innerHTML = '<div class="alerts-loading">Loading alerts...</div>';
      return;
    }
    
    const { items, total, summary } = alerts;
    
    this._container.innerHTML = `
      <div class="alerts-dashboard">
        <div class="alerts-header">