/**
 * compliance-dashboard/js/main.js
 * Core application logic: navigation, state management, API calls to security tool endpoints
 * 
 * Implements application security practice stack per spec §10.4
 * ASVS Level 2 baseline with Level 3 for credit-svc and compliance-svc
 * 
 * @owner service:compliance
 * @depends_on [203, 205]
 * @maturity_target lender_ready
 */

'use strict';

// ============================================================================
// Constants & Configuration
// ============================================================================

const CONFIG = Object.freeze({
  API_BASE_URL: '/api/v1',
  POLL_INTERVAL: 30000, // 30 seconds
  REQUEST_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  ENDPOINTS: {
    SECURITY_STATUS: '/security/status',
    VULNERABILITIES: '/vulnerabilities',
    SCAN_SCHEDULE: '/scan/schedule',
    COMPLIANCE: '/compliance',
    ALERTS: '/alerts',
    METRICS: '/metrics',
    SAST_RESULTS: '/sast/results',
    DAST_RESULTS: '/dast/results',
    SCA_RESULTS: '/sca/results',
    SECRET_SCAN: '/secret-scan/results'
  },

  SEVERITY_LEVELS: Object.freeze({
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
    INFO: 'info'
  }),

  COMPLIANCE_LEVELS: Object.freeze({
    LEVEL_2: 'ASVS_L2',
    LEVEL_3: 'ASVS_L3'
  }),

  SERVICE_TYPES: Object.freeze({
    COMPLIANCE_SVC: 'compliance-svc',
    CREDIT_SVC: 'credit-svc',
    GENERAL: 'general'
  })
});

// ============================================================================
// State Management
// ============================================================================

class DashboardState {
  constructor() {
    this._state = {
      currentView: 'overview',
      securityStatus: null,
      vulnerabilities: [],
      scanSchedule: [],
      complianceData: null,
      alerts: [],
      metrics: {},
      loading: false,
      error: null,
      lastUpdated: null,
      filters: {
        severity: [],
        service: [],
        status: []
      }
    };
    this._listeners = new Map();
    this._history = [];
    this._maxHistory = 50;
  }

  get state() {
    return { ...this._state };
  }

  setState(updates) {
    const previousState = { ...this._state };
    this._state = { ...this._state, ...updates, lastUpdated: new Date().toISOString() };
    
    // Track history for undo/redo
    this._history.push({ previous: previousState, current: { ...this._state } });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }

    this._notifyListeners('stateChange', { previous: previousState, current: this._state });
  }

  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    
    // Return unsubscribe function
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  }

  _notifyListeners(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Listener error:', error);
        }
      });
    }
  }

  undo() {
    if (this._history.length === 0) return false;
    const lastState = this._history.pop();
    this._state = { ...lastState.previous };
    this._notifyListeners('stateChange', { previous: lastState.current, current: this._state });
    return true;
  }

  reset() {
    this._state = {
      currentView: 'overview',
      securityStatus: null,
      vulnerabilities: [],
      scanSchedule: [],
      complianceData: null,
      alerts: [],
      metrics: {},
      loading: false,
      error: null,
      lastUpdated: null,
      filters: {
        severity: [],
        service: [],
        status: []
      }
    };
    this._history = [];
    this._notifyListeners('stateChange', { previous: null, current: this._state });
  }
}

// ============================================================================
// API Client with Retry Logic & Security Headers
// ============================================================================

class ApiClient {
  constructor(baseUrl = CONFIG.API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.csrfToken = null;
    this.requestCounter = 0;
  }

  async _getCsrfToken() {
    if (!this.csrfToken) {
      try {
        const response = await fetch(`${this.baseUrl}/csrf-token`, {
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const data = await response.json();
        this.csrfToken = data.token;
      } catch (error) {
        console.warn('Failed to fetch CSRF token:', error);
      }
    }
    return this.csrfToken;
  }

  async _request(endpoint, options = {}) {
    const requestId = ++this.requestCounter;
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
      const token = await this._getCsrfToken();
      if (token) {
        defaultHeaders['X-CSRF-Token'] = token;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...defaultHeaders, ...options.headers },
        signal: controller.signal,
        credentials: 'include'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorBody
        );
      }

      // Security headers validation
      this._validateSecurityHeaders(response);

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      
      throw new ApiError('Network error', 0, error.message);
    }
  }

  _validateSecurityHeaders(response) {
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options'
    ];

    requiredHeaders.forEach(header => {
      if (!response.headers.get(header)) {
        console.warn(`Missing security header: ${header}`);
      }
    });
  }

  async get(endpoint, params = {}) {
    const queryString = Object.keys(params).length 
      ? '?' + new URLSearchParams(params).toString() 
      : '';
    
    return this._retryRequest(() => 
      this._request(`${endpoint}${queryString}`, { method: 'GET' })
    );
  }

  async post(endpoint, data = {}) {
    return this._retryRequest(() => 
      this._request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
      })
    );
  }

  async put(endpoint, data = {}) {
    return this._retryRequest(() => 
      this._request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
      })
    );
  }

  async delete(endpoint) {
    return this._retryRequest(() => 
      this._request(endpoint, { method: 'DELETE' })
    );
  }

  async _retryRequest(requestFn, retries = CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === retries || error.status < 500) {
          throw error;
        }
        
        const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// ============================================================================
// Custom Error Class
// ============================================================================

class ApiError extends Error {
  constructor(message, status, body = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.timestamp = new Date().toISOString();
  }
}

// ============================================================================
// Security Tool Integration Services
// ============================================================================

class SecurityToolService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  // SAST (Semgrep + CodeQL) Results
  async getSastResults(serviceType = null) {
    const params = {};
    if (serviceType) params.service = serviceType;
    return this.api.get(CONFIG.ENDPOINTS.SAST_RESULTS, params);
  }

  // DAST (ZAP) Results
  async getDastResults() {
    return this.api.get(CONFIG.ENDPOINTS.DAST_RESULTS);
  }

  // SCA (Snyk) Results
  async getScaResults() {
    return this.api.get(CONFIG.ENDPOINTS.SCA_RESULTS);
  }

  // Secret Scanning Results
  async getSecretScanResults() {
    return this.api.get(CONFIG.ENDPOINTS.SECRET_SCAN);
  }

  // Overall Security Status
  async getSecurityStatus() {
    return this.api.get(CONFIG.ENDPOINTS.SECURITY_STATUS);
  }

  // Vulnerabilities with filters
  async getVulnerabilities(filters = {}) {
    return this.api.get(CONFIG.ENDPOINTS.VULNERABILITIES, filters);
  }

  // Scan Schedule
  async getScanSchedule() {
    return this.api.get(CONFIG.ENDPOINTS.SCAN_SCHEDULE);
  }

  // Compliance Data
  async getComplianceData(serviceType = null) {
    const params = {};
    if (serviceType) params.service = serviceType;
    return this.api.get(CONFIG.ENDPOINTS.COMPLIANCE, params);
  }

  // Alerts
  async getAlerts(filters = {}) {
    return this.api.get(CONFIG.ENDPOINTS.ALERTS, filters);
  }

  // Metrics
  async getMetrics() {
    return this.api.get(CONFIG.ENDPOINTS.METRICS);
  }

  // Trigger a new scan
  async triggerScan(scanType, targetService = null) {
    const payload = { scan_type: scanType };
    if (targetService) payload.target_service = targetService;
    return this.api.post('/scan/trigger', payload);
  }

  // Acknowledge alert
  async acknowledgeAlert(alertId) {
    return this.api.put(`${CONFIG.ENDPOINTS.ALERTS}/${alertId}/acknowledge`);
  }

  // Update vulnerability status
  async updateVulnerabilityStatus(vulnId, status, remediationNotes = '') {
    return this.api.put(`${CONFIG.ENDPOINTS.VULNERABILITIES}/${vulnId}/status`, {
      status,
      remediation_notes: remediationNotes
    });
  }
}

// ============================================================================
// Navigation Manager
// ============================================================================

class NavigationManager {
  constructor(stateManager) {
    this.state = stateManager;
    this.routes = new Map();
    this.currentRoute = null;
    this._initRouter();
  }

  _initRouter() {
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.route) {
        this.navigate(event.state.route, { replace: true, fromPopState: true });
      }
    });
  }

  registerRoute(name, handler, options = {}) {
    this.routes.set(name, { handler, options });
  }

  async navigate(route, options = {}) {
    const routeConfig = this.routes.get(route);
    
    if (!routeConfig) {
      console.error(`Route not found: ${route}`);
      return;
    }

    // Prevent navigation if already on this route
    if (this.currentRoute === route && !options.force) {
      return;
    }

    this.currentRoute = route;
    this.state.setState({ currentView: route, loading: true, error: null });

    try {
      await routeConfig.handler();
      
      // Update browser history
      if (!options.replace && !options.fromPopState) {
        window.history.pushState({ route }, '', `#${route}`);
      } else if (options.replace) {
        window.history.replaceState({ route }, '', `#${route}`);
      }

      this.state.setState({ loading: false });
    } catch (error) {
      this.state.setState({ 
        loading: false, 
        error: { route, message: error.message } 
      });
      console.error(`Navigation error for route "${route}":`, error);
    }
  }

  getCurrentRoute() {
    return this.currentRoute;
  }

  // Handle initial route from URL hash
  handleInitialRoute() {
    const hash = window.location.hash.slice(1) || 'overview';
    this.navigate(hash, { replace: true });
  }
}

// ============================================================================
// Data Polling Manager
// ============================================================================

class PollingManager {
  constructor(interval = CONFIG.POLL_INTERVAL) {
    this.interval = interval;
    this.pollers = new Map();
    this.active = false;
  }

  registerPoller(name, callback, customInterval = null) {
    this.pollers.set(name, {
      callback,
      interval: customInterval || this.interval,
      lastRun: null,
      timerId: null
    });
  }

  start() {
    if (this.active) return;
    this.active = true;
    
    this.pollers.forEach((poller, name) => {
      this._runPoller(name);
    });
  }

  stop() {
    this.active = false;
    this.pollers.forEach((poller) => {
      if (poller.timerId) {
        clearTimeout(poller.timerId);
        poller.timerId = null;
      }
    });
  }

  async _runPoller(name) {
    if (!this.active) return;

    const poller = this.pollers.get(name);
    if (!poller) return;

    try {
      poller.lastRun = new Date().toISOString();
      await poller.callback();
    } catch (error) {
      console.error(`Polling error for "${name}":`, error);
    }

    if (this.active) {
      poller.timerId = setTimeout(() => this._runPoller(name), poller.interval);
    }
  }

  updateInterval(name, newInterval) {
    const poller = this.pollers.get(name);
    if (poller) {
      poller.interval = newInterval;
      if (poller.timerId) {
        clearTimeout(poller.timerId);
        this._runPoller(name);
      }
    }
  }

  removePoller(name) {
    const poller = this.pollers.get(name);
    if (poller && poller.timerId) {
      clearTimeout(poller.timerId);
    }
    this.pollers.delete(name);
  }
}

// ============================================================================
// UI Component Manager
// ============================================================================

class UIComponentManager {
  constructor() {
    this.components = new Map();
    this.eventDelegationRoot = document.getElementById('app') || document.body;
    this._initEventDelegation();
  }

  registerComponent(name, component) {
    this.components.set(name, component);
  }

  getComponent(name) {
    return this.components.get(name);
  }

  renderComponent(name, containerId, data = {}) {
    const component = this.components.get(name);
    if (!component) {
      console.error(`Component not found: ${name}`);
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container not found: ${containerId}`);
      return;
    }

    try {
      const html = component.render(data);
      container.innerHTML = html;
      component.afterRender?.(container, data);
    } catch (error) {
      console.error(`Error rendering component "${name}":`, error);
      container.innerHTML = `<div class="error-message">Failed to load ${name}</div>`;
    }
  }

  _initEventDelegation() {
    this.eventDelegationRoot.addEventListener('click', (event) => {
      const target = event.target.closest('[data-action]');
      if (target) {
        const action = target.dataset.action;
        const params = target.dataset.params ? JSON.parse(target.dataset.params) : {};
        this._handleAction(action, params, event);
      }
    });
  }

  _handleAction(action, params, event) {
    const handler = this[`action_${action}`];
    if (handler) {
      handler.call(this, params, event);
    }
  }

  // Built-in actions
  action_navigate(params) {
    const navManager = window.__dashboard?.navigation;
    if (navManager && params.route) {
      navManager.navigate(params.route);
    }
  }

  action_refresh(params) {
    const dashboard = window.__dashboard;
    if (dashboard && params.section) {
      dashboard.refreshSection(params.section);
    }
  }
}

// ============================================================================
// Main Dashboard Application
// ============================================================================

class ComplianceDashboard {
  constructor() {
    this.state = new DashboardState();
    this.api = new ApiClient();
    this.securityTools = new SecurityToolService(this.api);
    this.navigation = new NavigationManager(this.state);
    this.polling = new PollingManager();
    this.ui = new UIComponentManager();
    
    // Store reference for global access
    window.__dashboard = this;