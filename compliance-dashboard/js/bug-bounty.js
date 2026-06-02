/**
 * compliance-dashboard/js/bug-bounty.js
 * Bug bounty program management: scope editor, reward calculator, submission form validation
 * Owner: service:compliance
 * Depends on: [203, 205]
 * Spec: §10.4
 * Blueprint: §XII
 * Maturity: lender_ready
 */

'use strict';

// ============================================================================
// Constants & Configuration
// ============================================================================

const BUG_BOUNTY_CONFIG = Object.freeze({
  apiBasePath: '/api/v1/bug-bounty',
  csrfTokenMeta: 'csrf-token',
  severityLevels: ['critical', 'high', 'medium', 'low', 'informational'],
  defaultRewardTiers: Object.freeze({
    critical: { min: 5000, max: 20000, currency: 'USD' },
    high: { min: 2000, max: 10000, currency: 'USD' },
    medium: { min: 500, max: 3000, currency: 'USD' },
    low: { min: 100, max: 1000, currency: 'USD' },
    informational: { min: 0, max: 100, currency: 'USD' }
  }),
  maxScopeDepth: 5,
  maxScopeEntries: 500,
  submissionMaxSize: 10 * 1024 * 1024, // 10MB
  allowedFileTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'text/plain'],
  rateLimit: {
    submissions: { windowMs: 3600000, maxRequests: 10 }, // 10 per hour
    scopeChanges: { windowMs: 60000, maxRequests: 5 }    // 5 per minute
  },
  validation: {
    minDescriptionLength: 50,
    maxDescriptionLength: 5000,
    minStepsToReproduce: 20,
    maxStepsToReproduce: 3000,
    urlPattern: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    cvePattern: /^CVE-\d{4}-\d{4,}$/i
  }
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Raw user input
 * @returns {string} Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  const reg = /[&<>"'/]/gi;
  return input.replace(reg, (match) => map[match]);
}

/**
 * Get CSRF token from meta tag
 * @returns {string} CSRF token
 * @throws {Error} If token not found
 */
function getCsrfToken() {
  const meta = document.querySelector(`meta[name="${BUG_BOUNTY_CONFIG.csrfTokenMeta}"]`);
  if (!meta) {
    throw new Error('CSRF token meta tag not found');
  }
  return meta.getAttribute('content');
}

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${BUG_BOUNTY_CONFIG.apiBasePath}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API request failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Debounce function for rate limiting
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay = 300) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Validate file size and type
 * @param {File} file - File to validate
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
function validateFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };
  
  if (file.size > BUG_BOUNTY_CONFIG.submissionMaxSize) {
    return { valid: false, error: `File size exceeds ${BUG_BOUNTY_CONFIG.submissionMaxSize / (1024 * 1024)}MB limit` };
  }
  
  if (!BUG_BOUNTY_CONFIG.allowedFileTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }
  
  return { valid: true };
}

// ============================================================================
// Scope Editor Module
// ============================================================================

class ScopeEditor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    
    this.scopeEntries = [];
    this.unsavedChanges = false;
    this.rateLimitCounter = { count: 0, resetAt: Date.now() };
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadScope();
  }

  render() {
    this.container.innerHTML = `
      <div class="scope-editor" role="region" aria-label="Bug bounty scope editor">
        <div class="scope-editor__header">
          <h2 class="scope-editor__title">Scope Configuration</h2>
          <div class="scope-editor__actions">
            <button class="btn btn--primary" id="addScopeEntry" aria-label="Add scope entry">
              <span aria-hidden="true">+</span> Add Entry
            </button>
            <button class="btn btn--secondary" id="saveScope" aria-label="Save scope changes" disabled>
              Save Changes
            </button>
          </div>
        </div>
        <div class="scope-editor__stats" aria-live="polite">
          <span id="scopeEntryCount">0 entries</span>
          <span id="scopeLastModified">Last modified: Never</span>
        </div>
        <div class="scope-editor__table-wrapper">
          <table class="scope-editor__table" role="grid" aria-label="Scope entries">
            <thead>
              <tr>
                <th scope="col">Target</th>
                <th scope="col">Type</th>
                <th scope="col">Severity</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody id="scopeTableBody">
              <tr class="scope-editor__empty-state">
                <td colspan="5">No scope entries configured. Click "Add Entry" to begin.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="scope-editor__validation-errors" id="scopeValidationErrors" role="alert" aria-live="assertive"></div>
      </div>
    `;
  }

  bindEvents() {
    document.getElementById('addScopeEntry').addEventListener('click', () => this.addEntry());
    document.getElementById('saveScope').addEventListener('click', () => this.saveScope());
    
    // Keyboard shortcuts
    this.container.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          this.saveScope();
        }
      }
    });
  }

  async loadScope() {
    try {
      const data = await apiRequest('/scope');
      this.scopeEntries = data.entries || [];
      this.updateTable();
      this.updateStats();
    } catch (error) {
      this.showError('Failed to load scope: ' + error.message);
    }
  }

  addEntry(entry = {}) {
    if (this.scopeEntries.length >= BUG_BOUNTY_CONFIG.maxScopeEntries) {
      this.showError(`Maximum of ${BUG_BOUNTY_CONFIG.maxScopeEntries} scope entries reached`);
      return;
    }

    const newEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      target: entry.target || '',
      type: entry.type || 'url',
      severity: entry.severity || 'medium',
      status: entry.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scopeEntries.push(newEntry);
    this.unsavedChanges = true;
    this.updateTable();
    this.updateStats();
    this.enableSaveButton();
  }

  removeEntry(entryId) {
    this.scopeEntries = this.scopeEntries.filter(e => e.id !== entryId);
    this.unsavedChanges = true;
    this.updateTable();
    this.updateStats();
    this.enableSaveButton();
  }

  updateEntry(entryId, updates) {
    const index = this.scopeEntries.findIndex(e => e.id === entryId);
    if (index === -1) return;
    
    this.scopeEntries[index] = {
      ...this.scopeEntries[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    this.unsavedChanges = true;
    this.updateTable();
    this.enableSaveButton();
  }

  updateTable() {
    const tbody = document.getElementById('scopeTableBody');
    
    if (this.scopeEntries.length === 0) {
      tbody.innerHTML = `
        <tr class="scope-editor__empty-state">
          <td colspan="5">No scope entries configured. Click "Add Entry" to begin.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.scopeEntries.map(entry => `
      <tr class="scope-editor__entry scope-editor__entry--${entry.status}" data-entry-id="${entry.id}">
        <td class="scope-editor__cell scope-editor__cell--target">
          <input type="text" 
                 class="scope-editor__input" 
                 value="${sanitizeInput(entry.target)}" 
                 data-field="target"
                 aria-label="Target URL or pattern"
                 maxlength="500">
        </td>
        <td class="scope-editor__cell">
          <select class="scope-editor__select" data-field="type" aria-label="Entry type">
            <option value="url" ${entry.type === 'url' ? 'selected' : ''}>URL</option>
            <option value="ip" ${entry.type === 'ip' ? 'selected' : ''}>IP Range</option>
            <option value="domain" ${entry.type === 'domain' ? 'selected' : ''}>Domain</option>
            <option value="api" ${entry.type === 'api' ? 'selected' : ''}>API Endpoint</option>
            <option value="mobile" ${entry.type === 'mobile' ? 'selected' : ''}>Mobile App</option>
          </select>
        </td>
        <td class="scope-editor__cell">
          <select class="scope-editor__select" data-field="severity" aria-label="Severity level">
            ${BUG_BOUNTY_CONFIG.severityLevels.map(sev => 
              `<option value="${sev}" ${entry.severity === sev ? 'selected' : ''}>${sev.charAt(0).toUpperCase() + sev.slice(1)}</option>`
            ).join('')}
          </select>
        </td>
        <td class="scope-editor__cell">
          <select class="scope-editor__select" data-field="status" aria-label="Entry status">
            <option value="active" ${entry.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${entry.status === 'inactive' ? 'selected' : ''}>Inactive</option>
            <option value="deprecated" ${entry.status === 'deprecated' ? 'selected' : ''}>Deprecated</option>
          </select>
        </td>
        <td class="scope-editor__cell scope-editor__cell--actions">
          <button class="btn btn--small btn--danger" 
                  data-action="remove" 
                  data-entry-id="${entry.id}"
                  aria-label="Remove scope entry">
            Remove
          </button>
        </td>
      </tr>
    `).join('');

    // Bind inline edit events
    tbody.querySelectorAll('input, select').forEach(element => {
      element.addEventListener('change', (e) => {
        const row = e.target.closest('tr');
        const entryId = row.dataset.entryId;
        const field = e.target.dataset.field;
        this.updateEntry(entryId, { [field]: e.target.value });
      });
    });

    tbody.querySelectorAll('[data-action="remove"]').forEach(button => {
      button.addEventListener('click', (e) => {
        const entryId = e.target.dataset.entryId;
        if (confirm('Are you sure you want to remove this scope entry?')) {
          this.removeEntry(entryId);
        }
      });
    });
  }

  updateStats() {
    const countEl = document.getElementById('scopeEntryCount');
    const modifiedEl = document.getElementById('scopeLastModified');
    
    countEl.textContent = `${this.scopeEntries.length} entries`;
    
    const lastModified = this.scopeEntries.length > 0 
      ? new Date(Math.max(...this.scopeEntries.map(e => new Date(e.updatedAt)))).toLocaleString()
      : 'Never';
    modifiedEl.textContent = `Last modified: ${lastModified}`;
  }

  enableSaveButton() {
    document.getElementById('saveScope').disabled = false;
  }

  async saveScope() {
    // Rate limiting check
    if (Date.now() < this.rateLimitCounter.resetAt) {
      if (this.rateLimitCounter.count >= BUG_BOUNTY_CONFIG.rateLimit.scopeChanges.maxRequests) {
        this.showError('Rate limit exceeded. Please wait before saving again.');
        return;
      }
      this.rateLimitCounter.count++;
    } else {
      this.rateLimitCounter = { count: 1, resetAt: Date.now() + BUG_BOUNTY_CONFIG.rateLimit.scopeChanges.windowMs };
    }

    // Validate entries
    const errors = this.validateScope();
    if (errors.length > 0) {
      this.showError(errors.join('\n'));
      return;
    }

    try {
      await apiRequest('/scope', {
        method: 'PUT',
        body: JSON.stringify({ entries: this.scopeEntries })
      });
      
      this.unsavedChanges = false;
      document.getElementById('saveScope').disabled = true;
      this.showSuccess('Scope saved successfully');
    } catch (error) {
      this.showError('Failed to save scope: ' + error.message);
    }
  }

  validateScope() {
    const errors = [];
    
    for (const entry of this.scopeEntries) {
      if (!entry.target || entry.target.trim() === '') {
        errors.push('All entries must have a target');
        break;
      }
      
      if (entry.target.length > 500) {
        errors.push('Target URL/pattern must be 500 characters or less');
        break;
      }
    }
    
    return errors;
  }

  showError(message) {
    const errorEl = document.getElementById('scopeValidationErrors');
    errorEl.textContent = message;
    errorEl.classList.add('scope-editor__validation-errors--visible');
    setTimeout(() => {
      errorEl.classList.remove('scope-editor__validation-errors--visible');
    }, 5000);
  }

  showSuccess(message) {
    const errorEl = document.getElementById('scopeValidationErrors');
    errorEl.textContent = message;
    errorEl.classList.add('scope-editor__validation-errors--success');
    setTimeout(() => {
      errorEl.classList.remove('scope-editor__validation-errors--success');
    }, 3000);
  }
}

// ============================================================================
// Reward Calculator Module
// ============================================================================

class RewardCalculator {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container element #${containerId} not found`);
    }
    
    this.rewardTiers = { ...BUG_BOUNTY_CONFIG.defaultRewardTiers };
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="reward-calculator" role="region" aria-label="Reward calculator">
        <h2 class="reward-calculator__title">Reward Calculator</h2>
        
        <div class="reward-calculator__form">
          <div class="reward-calculator__field">
            <label for="severitySelect">Severity Level</label>
            <select id="severitySelect" class="reward-calculator__select" aria-describedby="severityHelp">
              ${BUG_BOUNTY_CONFIG.severityLevels.map(sev => 
                `<option value="${sev}">${sev.charAt(0).toUpperCase() + sev.slice(1)}</option>`
              ).join('')}
            </select>
            <span id="severityHelp" class="reward-calculator__help">Select the vulnerability severity</span>
          </div>
          
          <div class="reward-calculator__field">
            <label for="cvssScore">CVSS Score (optional)</label>
            <input type="number" 
                   id="cvssScore" 
                   class="reward-calculator__input" 
                   min="0" 
                   max="10" 
                   step="0.1"
                   aria-describedby="cvssHelp">
            <span id