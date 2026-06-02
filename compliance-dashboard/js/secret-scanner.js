/**
 * compliance-dashboard/js/secret-scanner.js
 * GitGuardian integration: secret detection log, push protection status, incident management
 * 
 * Implements application security practice stack per spec §10.4
 * ASVS Level 2 baseline, Level 3 for credit-svc and compliance-svc
 * 
 * @owner service:compliance
 * @depends_on [203, 205]
 * @spec_sections ["§10.4"]
 * @blueprint_sections ["§XII"]
 * @maturity_target lender_ready
 */

'use strict';

// ─── Configuration ───────────────────────────────────────────────────────────
const CONFIG = Object.freeze({
  API_BASE_URL: '/api/v1/secret-scanner',
  POLL_INTERVAL_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
  CACHE_TTL_MS: 60000,
  SEVERITY_LEVELS: ['critical', 'high', 'medium', 'low'],
  INCIDENT_STATUSES: ['open', 'acknowledged', 'resolved', 'dismissed'],
  PUSH_PROTECTION_STATUSES: ['enabled', 'disabled', 'error'],
  ASVS_LEVEL_MAP: {
    'credit-svc': 3,
    'compliance-svc': 3,
    'default': 2
  }
});

// ─── Error Types ─────────────────────────────────────────────────────────────
class SecretScannerError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'SecretScannerError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

class AuthenticationError extends SecretScannerError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

class RateLimitError extends SecretScannerError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 'RATE_LIMIT', 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

class ValidationError extends SecretScannerError {
  constructor(message, details = []) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// ─── Utility Functions ───────────────────────────────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>&"'']/g, (char) => {
    const map = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' };
    return map[char] || char;
  });
};

const validateSeverity = (severity) => {
  if (!CONFIG.SEVERITY_LEVELS.includes(severity)) {
    throw new ValidationError(`Invalid severity: ${severity}`, [
      { field: 'severity', message: `Must be one of: ${CONFIG.SEVERITY_LEVELS.join(', ')}` }
    ]);
  }
  return severity;
};

const validateIncidentStatus = (status) => {
  if (!CONFIG.INCIDENT_STATUSES.includes(status)) {
    throw new ValidationError(`Invalid incident status: ${status}`, [
      { field: 'status', message: `Must be one of: ${CONFIG.INCIDENT_STATUSES.join(', ')}` }
    ]);
  }
  return status;
};

// ─── Cache Layer ─────────────────────────────────────────────────────────────
class CacheManager {
  constructor(ttlMs = CONFIG.CACHE_TTL_MS) {
    this._cache = new Map();
    this._ttlMs = ttlMs;
  }

  get(key) {
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this._ttlMs) {
      this._cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key, data) {
    this._cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  invalidate(key) {
    this._cache.delete(key);
  }

  clear() {
    this._cache.clear();
  }

  get size() {
    return this._cache.size;
  }
}

// ─── API Client ──────────────────────────────────────────────────────────────
class ApiClient {
  constructor(baseUrl = CONFIG.API_BASE_URL) {
    this._baseUrl = baseUrl;
    this._cache = new CacheManager();
    this._abortController = null;
  }

  async _request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      useCache = true,
      retryAttempts = CONFIG.RETRY_ATTEMPTS
    } = options;

    const cacheKey = `${method}:${endpoint}:${JSON.stringify(body)}`;
    
    if (method === 'GET' && useCache) {
      const cached = this._cache.get(cacheKey);
      if (cached) return cached;
    }

    let lastError = null;
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        this._abortController = new AbortController();
        const timeoutId = setTimeout(() => this._abortController.abort(), 30000);

        const response = await fetch(`${this._baseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': generateId(),
            ...headers
          },
          body: body ? JSON.stringify(body) : null,
          signal: this._abortController.signal,
          credentials: 'same-origin'
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          switch (response.status) {
            case 401:
              throw new AuthenticationError();
            case 429:
              const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
              throw new RateLimitError(retryAfter);
            case 400:
              const errorBody = await response.json().catch(() => ({}));
              throw new ValidationError(errorBody.message || 'Bad request', errorBody.details || []);
            default:
              throw new SecretScannerError(
                `HTTP ${response.status}: ${response.statusText}`,
                'HTTP_ERROR',
                response.status
              );
          }
        }

        const data = await response.json();

        if (method === 'GET' && useCache) {
          this._cache.set(cacheKey, data);
        }

        return data;
      } catch (error) {
        lastError = error;
        
        if (error instanceof AuthenticationError || error instanceof ValidationError) {
          throw error;
        }

        if (error instanceof RateLimitError) {
          await delay(error.retryAfter * 1000);
          continue;
        }

        if (attempt < retryAttempts - 1) {
          await delay(CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new SecretScannerError('Request failed after retries', 'MAX_RETRIES_EXCEEDED');
  }

  abort() {
    if (this._abortController) {
      this._abortController.abort();
    }
  }

  invalidateCache(pattern) {
    if (pattern) {
      for (const key of this._cache.keys()) {
        if (key.includes(pattern)) {
          this._cache.invalidate(key);
        }
      }
    } else {
      this._cache.clear();
    }
  }
}

// ─── Secret Detection Log ────────────────────────────────────────────────────
class SecretDetectionLog {
  constructor(apiClient) {
    this._api = apiClient;
    this._listeners = new Map();
    this._pollingInterval = null;
  }

  async getSecrets(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.severity) {
      validateSeverity(filters.severity);
      queryParams.set('severity', filters.severity);
    }
    
    if (filters.status) {
      validateIncidentStatus(filters.status);
      queryParams.set('status', filters.status);
    }
    
    if (filters.service) {
      queryParams.set('service', sanitizeInput(filters.service));
    }
    
    if (filters.limit) {
      queryParams.set('limit', Math.min(Math.max(1, filters.limit), 100).toString());
    }
    
    if (filters.offset) {
      queryParams.set('offset', Math.max(0, filters.offset).toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/secrets${queryString ? `?${queryString}` : ''}`;
    
    return this._api._request(endpoint, { useCache: true });
  }

  async getSecretById(id) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid secret ID', [
        { field: 'id', message: 'Secret ID is required and must be a string' }
      ]);
    }
    return this._api._request(`/secrets/${encodeURIComponent(id)}`, { useCache: true });
  }

  async acknowledgeSecret(id, comment = '') {
    if (!id) throw new ValidationError('Secret ID is required');
    return this._api._request(`/secrets/${encodeURIComponent(id)}/acknowledge`, {
      method: 'POST',
      body: { comment: sanitizeInput(comment) },
      useCache: false
    });
  }

  async resolveSecret(id, remediation = '') {
    if (!id) throw new ValidationError('Secret ID is required');
    return this._api._request(`/secrets/${encodeURIComponent(id)}/resolve`, {
      method: 'POST',
      body: { remediation: sanitizeInput(remediation) },
      useCache: false
    });
  }

  async dismissSecret(id, reason = '') {
    if (!id) throw new ValidationError('Secret ID is required');
    return this._api._request(`/secrets/${encodeURIComponent(id)}/dismiss`, {
      method: 'POST',
      body: { reason: sanitizeInput(reason) },
      useCache: false
    });
  }

  subscribe(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    
    return () => {
      this._listeners.get(event)?.delete(callback);
    };
  }

  _notify(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Secret detection listener error:', error);
        }
      });
    }
  }

  startPolling(intervalMs = CONFIG.POLL_INTERVAL_MS) {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
    }

    this._pollingInterval = setInterval(async () => {
      try {
        const secrets = await this.getSecrets({ limit: 50 });
        this._notify('update', secrets);
      } catch (error) {
        this._notify('error', error);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
  }

  destroy() {
    this.stopPolling();
    this._listeners.clear();
  }
}

// ─── Push Protection Status ──────────────────────────────────────────────────
class PushProtectionStatus {
  constructor(apiClient) {
    this._api = apiClient;
    this._statusCache = new Map();
  }

  async getStatus(serviceName) {
    if (!serviceName) {
      throw new ValidationError('Service name is required', [
        { field: 'serviceName', message: 'Service name must be provided' }
      ]);
    }

    const cached = this._statusCache.get(serviceName);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS) {
      return cached.data;
    }

    const status = await this._api._request(
      `/push-protection/${encodeURIComponent(serviceName)}`,
      { useCache: false }
    );

    if (!CONFIG.PUSH_PROTECTION_STATUSES.includes(status.status)) {
      status.status = 'error';
    }

    this._statusCache.set(serviceName, {
      data: status,
      timestamp: Date.now()
    });

    return status;
  }

  async getAllStatuses() {
    const statuses = await this._api._request('/push-protection', { useCache: true });
    
    return statuses.map(status => {
      if (!CONFIG.PUSH_PROTECTION_STATUSES.includes(status.status)) {
        status.status = 'error';
      }
      return status;
    });
  }

  async enableProtection(serviceName) {
    if (!serviceName) throw new ValidationError('Service name is required');
    
    const result = await this._api._request(
      `/push-protection/${encodeURIComponent(serviceName)}/enable`,
      { method: 'POST', useCache: false }
    );
    
    this._statusCache.delete(serviceName);
    return result;
  }

  async disableProtection(serviceName, reason = '') {
    if (!serviceName) throw new ValidationError('Service name is required');
    
    const result = await this._api._request(
      `/push-protection/${encodeURIComponent(serviceName)}/disable`,
      { method: 'POST', body: { reason: sanitizeInput(reason) }, useCache: false }
    );
    
    this._statusCache.delete(serviceName);
    return result;
  }

  getASVSLevel(serviceName) {
    return CONFIG.ASVS_LEVEL_MAP[serviceName] || CONFIG.ASVS_LEVEL_MAP.default;
  }

  invalidateCache(serviceName) {
    if (serviceName) {
      this._statusCache.delete(serviceName);
    } else {
      this._statusCache.clear();
    }
  }
}

// ─── Incident Management ─────────────────────────────────────────────────────
class IncidentManager {
  constructor(apiClient) {
    this._api = apiClient;
    this._incidents = new Map();
    this._listeners = new Map();
  }

  async getIncidents(filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.status) {
      validateIncidentStatus(filters.status);
      queryParams.set('status', filters.status);
    }
    
    if (filters.severity) {
      validateSeverity(filters.severity);
      queryParams.set('severity', filters.severity);
    }
    
    if (filters.service) {
      queryParams.set('service', sanitizeInput(filters.service));
    }
    
    if (filters.from) {
      queryParams.set('from', filters.from);
    }
    
    if (filters.to) {
      queryParams.set('to', filters.to);
    }
    
    if (filters.limit) {
      queryParams.set('limit', Math.min(Math.max(1, filters.limit), 100).toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/incidents${queryString ? `?${queryString}` : ''}`;
    
    const incidents = await this._api._request(endpoint, { useCache: true });
    
    incidents.forEach(incident => {
      this._incidents.set(incident.id, incident);
    });
    
    return incidents;
  }

  async getIncidentById(id) {
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid incident ID', [
        { field: 'id', message: 'Incident ID is required and must be a string' }
      ]);
    }

    if (this._incidents.has(id)) {
      return this._incidents.get(id);
    }

    const incident = await this._api._request(
      `/incidents/${encodeURIComponent(id)}`,
      { useCache: true }
    );
    
    this._incidents.set(id, incident);
    return incident;
  }

  async createIncident(incidentData) {
    const requiredFields = ['type', 'severity', 'service', 'description'];
    const missingFields = requiredFields.filter(field => !incidentData[field]);
    
    if (missingFields.length > 0) {
      throw new ValidationError('Missing required fields', 
        missingFields.map(field => ({
          field,
          message: `${field} is required`
        }))
      );
    }

    validateSeverity(incidentData.severity);

    const sanitizedData = {
      type: sanitizeInput(incidentData.type),
      severity: incidentData.severity,
      service: sanitizeInput(incidentData.service),
      description: sanitizeInput(incidentData.description),
      metadata: incidentData.metadata || {}
    };

    const incident = await this._api._request('/incidents', {
      method: 'POST',
      body: sanitizedData,
      useCache: false
    });

    this._incidents.set(incident.id, incident);
    this._notify('created', incident);
    
    return incident;
  }

  async updateIncidentStatus(id, status, comment = '') {
    if (!id) throw new ValidationError('Incident ID is required');
    validateIncidentStatus(status);

    const updated = await this._api._request(`/incidents/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { 
        status, 
        comment: sanitizeInput(comment),
        updatedAt: new Date().toISOString()
      },
      useCache: false
    });

    this._incidents.set(id, updated);
    this._notify('updated', updated);
    
    return updated;
  }

  async assignIncident(id, assignee) {
    if (!id || !assignee) {
      throw