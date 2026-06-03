/**
 * Security Dashboard - Main Application
 * Owner: platform
 * Dependencies: [1345, 1357]
 * Spec: §10.4 - Application Security Practice Stack
 * Maturity Target: foundation
 */

// ============================================================================
// Configuration & Constants
// ============================================================================

const CONFIG = {
  API_BASE_URL: '/api/v1',
  POLLING_INTERVAL: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 10000,
  SEVERITY_LEVELS: {
    critical: { color: '#dc2626', label: 'Critical', order: 0 },
    high: { color: '#ea580c', label: 'High', order: 1 },
    medium: { color: '#ca8a04', label: 'Medium', order: 2 },
    low: { color: '#2563eb', label: 'Low', order: 3 },
    info: { color: '#6b7280', label: 'Info', order: 4 },
    pass: { color: '#16a34a', label: 'Pass', order: 5 }
  },
  SCAN_TYPES: {
    sast: { label: 'SAST', endpoint: '/scans/sast' },
    dast: { label: 'DAST', endpoint: '/scans/dast' },
    sca: { label: 'SCA', endpoint: '/scans/sca' },
    secret: { label: 'Secret Scanning', endpoint: '/scans/secret' }
  },
  TIMELINE_RANGES: {
    '7d': { label: '7 Days', days: 7 },
    '30d': { label: '30 Days', days: 30 },
    '90d': { label: '90 Days', days: 90 }
  }
};

// ============================================================================
// State Management
// ============================================================================

class DashboardState {
  constructor() {
    this._state = {
      scans: {},
      compliance: {},
      alerts: [],
      timeline: {},
      filters: {
        severity: 'all',
        scanType: 'all',
        dateRange: '7d'
      },
      loading: false,
      error: null,
      lastUpdated: null
    };
    this._listeners = new Map();
    this._listenerId = 0;
  }

  get(key) {
    return this._state[key];
  }

  set(key, value) {
    const prev = this._state[key];
    this._state[key] = value;
    this._notify(key, value, prev);
  }

  subscribe(key, callback) {
    const id = ++this._listenerId;
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Map());
    }
    this._listeners.get(key).set(id, callback);
    return () => {
      const listeners = this._listeners.get(key);
      if (listeners) listeners.delete(id);
    };
  }

  _notify(key, value, prev) {
    const listeners = this._listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(value, prev);
        } catch (err) {
          console.error(`State listener error for key "${key}":`, err);
        }
      });
    }
  }
}

const state = new DashboardState();

// ============================================================================
// API Client
// ============================================================================

class ApiClient {
  constructor(baseUrl = CONFIG.API_BASE_URL) {
    this._baseUrl = baseUrl;
    this._abortControllers = new Map();
  }

  async request(endpoint, options = {}) {
    const controller = new AbortController();
    const requestId = `${endpoint}-${Date.now()}`;
    this._abortControllers.set(requestId, controller);

    try {
      const response = await fetch(`${this._baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `HTTP ${response.status}`,
          response.status,
          error
        );
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request cancelled', 0);
      }
      throw err;
    } finally {
      this._abortControllers.delete(requestId);
    }
  }

  cancelAll() {
    this._abortControllers.forEach(controller => controller.abort());
    this._abortControllers.clear();
  }

  async getScans(scanType, params = {}) {
    const endpoint = CONFIG.SCAN_TYPES[scanType]?.endpoint;
    if (!endpoint) throw new ApiError(`Invalid scan type: ${scanType}`, 400);
    
    const queryParams = new URLSearchParams(params).toString();
    const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
    
    return this.request(url);
  }

  async getComplianceStatus() {
    return this.request('/compliance/status');
  }

  async getTimelineData(scanType, range = '7d') {
    const days = CONFIG.TIMELINE_RANGES[range]?.days || 7;
    const endpoint = CONFIG.SCAN_TYPES[scanType]?.endpoint;
    if (!endpoint) throw new ApiError(`Invalid scan type: ${scanType}`, 400);
    
    return this.request(`${endpoint}/timeline?days=${days}`);
  }

  async getAlerts(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const url = queryParams ? `/alerts?${queryParams}` : '/alerts';
    return this.request(url);
  }

  async acknowledgeAlert(alertId) {
    return this.request(`/alerts/${alertId}/acknowledge`, { method: 'POST' });
  }

  async triggerScan(scanType) {
    const endpoint = CONFIG.SCAN_TYPES[scanType]?.endpoint;
    if (!endpoint) throw new ApiError(`Invalid scan type: ${scanType}`, 400);
    
    return this.request(`${endpoint}/trigger`, { method: 'POST' });
  }
}

class ApiError extends Error {
  constructor(message, status, details = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

const api = new ApiClient();

// ============================================================================
// Data Fetching & Polling
// ============================================================================

class DataFetcher {
  constructor() {
    this._pollingIntervals = new Map();
    this._retryCount = new Map();
  }

  async fetchAll() {
    state.set('loading', true);
    state.set('error', null);

    try {
      const results = await Promise.allSettled([
        this._fetchAllScans(),
        this._fetchCompliance(),
        this._fetchAlerts(),
        this._fetchTimeline()
      ]);

      const errors = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason);

      if (errors.length > 0) {
        console.error('Data fetch errors:', errors);
        state.set('error', errors[0].message || 'Failed to fetch some data');
      }

      state.set('lastUpdated', new Date().toISOString());
    } catch (err) {
      state.set('error', err.message);
    } finally {
      state.set('loading', false);
    }
  }

  async _fetchAllScans() {
    const scanTypes = Object.keys(CONFIG.SCAN_TYPES);
    const results = await Promise.allSettled(
      scanTypes.map(type => this._fetchScanWithRetry(type))
    );

    const scans = {};
    results.forEach((result, index) => {
      const scanType = scanTypes[index];
      if (result.status === 'fulfilled') {
        scans[scanType] = result.value;
      } else {
        scans[scanType] = { error: result.reason.message, status: 'error' };
      }
    });

    state.set('scans', scans);
  }

  async _fetchScanWithRetry(scanType, attempt = 0) {
    try {
      const data = await api.getScans(scanType);
      this._retryCount.set(scanType, 0);
      return data;
    } catch (err) {
      if (attempt < CONFIG.RETRY_ATTEMPTS && this._isRetryable(err)) {
        const count = (this._retryCount.get(scanType) || 0) + 1;
        this._retryCount.set(scanType, count);
        
        await this._delay(CONFIG.RETRY_DELAY * Math.pow(2, attempt));
        return this._fetchScanWithRetry(scanType, attempt + 1);
      }
      throw err;
    }
  }

  _isRetryable(err) {
    return err instanceof ApiError && 
      (err.status >= 500 || err.status === 429 || err.status === 0);
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async _fetchCompliance() {
    const data = await api.getComplianceStatus();
    state.set('compliance', data);
  }

  async _fetchAlerts() {
    const filters = state.get('filters');
    const params = {};
    if (filters.severity !== 'all') params.severity = filters.severity;
    
    const data = await api.getAlerts(params);
    state.set('alerts', data);
  }

  async _fetchTimeline() {
    const filters = state.get('filters');
    const scanType = filters.scanType !== 'all' ? filters.scanType : 'sast';
    const range = filters.dateRange;
    
    const data = await api.getTimelineData(scanType, range);
    state.set('timeline', data);
  }

  startPolling(interval = CONFIG.POLLING_INTERVAL) {
    this.fetchAll();
    
    const id = setInterval(() => {
      this.fetchAll();
    }, interval);
    
    this._pollingIntervals.set('main', id);
  }

  stopPolling() {
    this._pollingIntervals.forEach((id, key) => {
      clearInterval(id);
    });
    this._pollingIntervals.clear();
    api.cancelAll();
  }
}

const dataFetcher = new DataFetcher();

// ============================================================================
// UI Components
// ============================================================================

class StatusBadge {
  constructor(container) {
    this._container = container;
  }

  render(status, label) {
    const badge = document.createElement('span');
    badge.className = `status-badge status-badge--${status}`;
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', `${label || status} status`);
    
    const icon = document.createElement('span');
    icon.className = 'status-badge__icon';
    icon.innerHTML = this._getIcon(status);
    
    const text = document.createElement('span');
    text.className = 'status-badge__text';
    text.textContent = label || status;
    
    badge.appendChild(icon);
    badge.appendChild(text);
    
    this._container.innerHTML = '';
    this._container.appendChild(badge);
  }

  _getIcon(status) {
    const icons = {
      pass: '✓',
      fail: '✗',
      warning: '⚠',
      error: '✕',
      running: '⟳'
    };
    return icons[status] || '?';
  }
}

class SeverityIndicator {
  constructor(container) {
    this._container = container;
  }

  render(severity, count) {
    const config = CONFIG.SEVERITY_LEVELS[severity];
    if (!config) return;

    const indicator = document.createElement('div');
    indicator.className = `severity-indicator severity-indicator--${severity}`;
    indicator.setAttribute('role', 'status');
    indicator.setAttribute('aria-label', `${config.label}: ${count || 0}`);

    const dot = document.createElement('span');
    dot.className = 'severity-indicator__dot';
    dot.style.backgroundColor = config.color;

    const label = document.createElement('span');
    label.className = 'severity-indicator__label';
    label.textContent = config.label;

    const value = document.createElement('span');
    value.className = 'severity-indicator__count';
    value.textContent = count || 0;

    indicator.appendChild(dot);
    indicator.appendChild(label);
    indicator.appendChild(value);

    this._container.innerHTML = '';
    this._container.appendChild(indicator);
  }
}

class ScanResultTable {
  constructor(container) {
    this._container = container;
    this._currentSort = { column: 'severity', direction: 'desc' };
    this._currentFilter = '';
  }

  render(data) {
    const table = document.createElement('table');
    table.className = 'scan-result-table';
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', 'Scan Results');

    const thead = this._createHeader();
    const tbody = this._createBody(data);

    table.appendChild(thead);
    table.appendChild(tbody);

    this._container.innerHTML = '';
    this._container.appendChild(table);
  }

  _createHeader() {
    const thead = document.createElement('thead');
    const row = document.createElement('tr');

    const columns = [
      { key: 'severity', label: 'Severity', sortable: true },
      { key: 'type', label: 'Type', sortable: true },
      { key: 'finding', label: 'Finding', sortable: false },
      { key: 'location', label: 'Location', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'date', label: 'Date', sortable: true }
    ];

    columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.setAttribute('scope', 'col');
      
      if (col.sortable) {
        th.classList.add('sortable');
        th.setAttribute('data-sort-key', col.key);
        th.setAttribute('role', 'columnheader button');
        th.setAttribute('tabindex', '0');
        th.setAttribute('aria-sort', 
          this._currentSort.column === col.key 
            ? (this._currentSort.direction === 'asc' ? 'ascending' : 'descending')
            : 'none'
        );
        
        th.addEventListener('click', () => this._sort(col.key));
        th.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._sort(col.key);
          }
        });
      }

      row.appendChild(th);
    });

    thead.appendChild(row);
    return thead;
  }

  _createBody(data) {
    const tbody = document.createElement('tbody');
    
    if (!data || data.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.setAttribute('colspan', '6');
      cell.textContent = 'No results found';
      cell.style.textAlign = 'center';
      row.appendChild(cell);
      tbody.appendChild(row);
      return tbody;
    }

    const sorted = this._sortData(data);
    const filtered = this._filterData(sorted);

    filtered.forEach(item => {
      const row = document.createElement('tr');
      row.className = `scan-result-row scan-result-row--${item.severity}`;

      const severityConfig = CONFIG.SEVERITY_LEVELS[item.severity] || {};
      
      const cells = [
        { content: this._createSeverityCell(item.severity), className: 'severity-cell' },
        { content: item.type, className: 'type-cell' },
        { content: item.finding, className: 'finding-cell' },
        { content: item.location, className: 'location-cell' },
        { content: this._createStatusCell(item.status), className: 'status-cell' },
        { content: this._formatDate(item.date), className: 'date-cell' }
      ];

      cells.forEach(cell => {
        const td = document.createElement('td');
        td.className = cell.className;
        if (typeof cell.content === 'string') {
          td.textContent = cell.content;
        } else {
          td.appendChild(cell.content);
        }
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    return tbody;
  }

  _createSeverityCell(severity) {
    const config = CONFIG.SEVERITY_LEVELS[severity];
    const container = document.createElement('span');
    container.className = 'severity-badge';
    container.style.backgroundColor = config?.color || '#6b7280';
    container.textContent = config?.label || severity;
    return container;
  }

  _createStatusCell(status) {
    const container = document.createElement('span');
    container.className = `status-indicator status-indicator--${status}`;
    container.textContent = status;
    return container;
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  _sort(column) {
    if (this._currentSort.column === column) {
      this._currentSort.direction = 
        this._currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this._currentSort.column = column;
      this._currentSort.direction = 'desc';
    }
    
    this._renderWithCurrentData();
  }

  _sortData(data) {
    const { column, direction } = this._currentSort;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...data].sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      if (column === 'severity') {
        aVal = CONFIG.SEVERITY_LEVELS[a