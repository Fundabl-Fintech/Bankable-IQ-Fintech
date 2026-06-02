/**
 * js/vendor-detail.js
 * Vendor detail page logic - credential status polling, environment toggle, SLA display, fallback vendor card
 * VendorOps Design System v1.0.0
 */

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────
  const DESIGN_TOKENS = {
    colors: {
      primary: '#1a73e8',
      success: '#0f9d58',
      warning: '#f4b400',
      danger: '#ea4335',
      neutral: '#5f6368',
      background: '#f8f9fa',
      surface: '#ffffff',
      text: '#202124',
    },
    spacing: [4, 8, 12, 16, 24, 32, 48, 64],
    breakpoints: { mobile: '320px', tablet: '768px', desktop: '1024px', wide: '1440px' },
  };

  const POLL_INTERVAL_MS = 30000; // 30 seconds
  const CREDENTIAL_STATUS_ENDPOINT = '/api/v1/vendors/credentials/status';
  const VENDOR_DETAIL_ENDPOINT = '/api/v1/vendors';

  // ─── State ───────────────────────────────────────────────────────────────────
  let state = {
    vendorId: null,
    vendor: null,
    credentials: null,
    environment: 'sandbox', // 'sandbox' | 'production'
    pollingIntervalId: null,
    isLoading: true,
    error: null,
  };

  // ─── DOM Cache ───────────────────────────────────────────────────────────────
  let elements = {};

  function cacheDom() {
    elements = {
      app: document.getElementById('vendor-detail-app'),
      vendorName: document.getElementById('vendor-name'),
      vendorCategory: document.getElementById('vendor-category'),
      vendorTier: document.getElementById('vendor-tier'),
      contractStatus: document.getElementById('contract-status'),
      contractRenewal: document.getElementById('contract-renewal'),
      credentialStatus: document.getElementById('credential-status'),
      credentialLastRotated: document.getElementById('credential-last-rotated'),
      environmentToggle: document.getElementById('environment-toggle'),
      sandboxConfig: document.getElementById('sandbox-config'),
      productionConfig: document.getElementById('production-config'),
      slaIndicator: document.getElementById('sla-indicator'),
      slaUptime: document.getElementById('sla-uptime'),
      slaResponseTime: document.getElementById('sla-response-time'),
      supportTier: document.getElementById('support-tier'),
      supportContact: document.getElementById('support-contact'),
      fallbackVendor: document.getElementById('fallback-vendor'),
      fallbackContingency: document.getElementById('fallback-contingency'),
      usageMonitor: document.getElementById('usage-monitor'),
      budgetAlert: document.getElementById('budget-alert'),
      loadingIndicator: document.getElementById('loading-indicator'),
      errorBanner: document.getElementById('error-banner'),
      errorMessage: document.getElementById('error-message'),
      lastUpdated: document.getElementById('last-updated'),
    };
  }

  // ─── Utility Functions ───────────────────────────────────────────────────────
  function getStatusColor(status) {
    const map = {
      active: DESIGN_TOKENS.colors.success,
      pending: DESIGN_TOKENS.colors.warning,
      expired: DESIGN_TOKENS.colors.danger,
      revoked: DESIGN_TOKENS.colors.danger,
      warning: DESIGN_TOKENS.colors.warning,
      ok: DESIGN_TOKENS.colors.success,
      error: DESIGN_TOKENS.colors.danger,
      healthy: DESIGN_TOKENS.colors.success,
      degraded: DESIGN_TOKENS.colors.warning,
      down: DESIGN_TOKENS.colors.danger,
    };
    return map[status?.toLowerCase()] || DESIGN_TOKENS.colors.neutral;
  }

  function formatDate(isoString) {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  }

  function formatCurrency(amount) {
    if (amount == null) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  function showLoading(show) {
    state.isLoading = show;
    if (elements.loadingIndicator) {
      elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    if (elements.app) {
      elements.app.style.opacity = show ? '0.4' : '1';
    }
  }

  function showError(message) {
    state.error = message;
    if (elements.errorBanner) {
      elements.errorBanner.style.display = message ? 'block' : 'none';
    }
    if (elements.errorMessage) {
      elements.errorMessage.textContent = message || '';
    }
  }

  function updateLastUpdated() {
    if (elements.lastUpdated) {
      elements.lastUpdated.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  }

  // ─── API Calls ───────────────────────────────────────────────────────────────
  async function fetchVendorDetail(vendorId) {
    const url = `${VENDOR_DETAIL_ENDPOINT}/${encodeURIComponent(vendorId)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch vendor detail: ${response.statusText}`);
    }
    return response.json();
  }

  async function fetchCredentialStatus(vendorId) {
    const url = `${CREDENTIAL_STATUS_ENDPOINT}/${encodeURIComponent(vendorId)}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch credential status: ${response.statusText}`);
    }
    return response.json();
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────
  function renderVendorHeader(vendor) {
    if (elements.vendorName) elements.vendorName.textContent = vendor.name || 'Unknown Vendor';
    if (elements.vendorCategory) elements.vendorCategory.textContent = vendor.category || 'N/A';
    if (elements.vendorTier) {
      elements.vendorTier.textContent = vendor.tier || 'N/A';
      elements.vendorTier.style.color = getStatusColor(vendor.tier);
    }
  }

  function renderContractStatus(vendor) {
    const contract = vendor.contract || {};
    if (elements.contractStatus) {
      const status = contract.status || 'unknown';
      elements.contractStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      elements.contractStatus.style.color = getStatusColor(status);
      elements.contractStatus.style.backgroundColor = `${getStatusColor(status)}18`;
      elements.contractStatus.style.padding = '2px 8px';
      elements.contractStatus.style.borderRadius = '4px';
    }
    if (elements.contractRenewal) {
      elements.contractRenewal.textContent = contract.renewalDate
        ? `Renewal: ${formatDate(contract.renewalDate)}`
        : 'No renewal date set';
    }
  }

  function renderCredentialStatus(credentials) {
    if (!credentials) return;
    if (elements.credentialStatus) {
      const status = credentials.status || 'unknown';
      elements.credentialStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      elements.credentialStatus.style.color = getStatusColor(status);
      elements.credentialStatus.style.backgroundColor = `${getStatusColor(status)}18`;
      elements.credentialStatus.style.padding = '2px 8px';
      elements.credentialStatus.style.borderRadius = '4px';
    }
    if (elements.credentialLastRotated) {
      elements.credentialLastRotated.textContent = credentials.lastRotated
        ? `Last rotated: ${formatDate(credentials.lastRotated)}`
        : 'Never rotated';
    }
  }

  function renderEnvironmentConfig(vendor) {
    const sandbox = vendor.environments?.sandbox || {};
    const production = vendor.environments?.production || {};

    if (elements.sandboxConfig) {
      elements.sandboxConfig.innerHTML = `
        <div class="config-item"><span class="config-label">API Key:</span> <code>${maskKey(sandbox.apiKey)}</code></div>
        <div class="config-item"><span class="config-label">Endpoint:</span> <code>${sandbox.endpoint || 'N/A'}</code></div>
        <div class="config-item"><span class="config-label">Status:</span> <span style="color:${getStatusColor(sandbox.status)}">${sandbox.status || 'unknown'}</span></div>
      `;
    }

    if (elements.productionConfig) {
      elements.productionConfig.innerHTML = `
        <div class="config-item"><span class="config-label">API Key:</span> <code>${maskKey(production.apiKey)}</code></div>
        <div class="config-item"><span class="config-label">Endpoint:</span> <code>${production.endpoint || 'N/A'}</code></div>
        <div class="config-item"><span class="config-label">Status:</span> <span style="color:${getStatusColor(production.status)}">${production.status || 'unknown'}</span></div>
      `;
    }

    // Toggle visibility based on current environment
    toggleEnvironmentVisibility(state.environment);
  }

  function maskKey(key) {
    if (!key) return '••••••••';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••' + key.slice(-4);
  }

  function toggleEnvironmentVisibility(env) {
    if (elements.sandboxConfig) {
      elements.sandboxConfig.style.display = env === 'sandbox' ? 'block' : 'none';
    }
    if (elements.productionConfig) {
      elements.productionConfig.style.display = env === 'production' ? 'block' : 'none';
    }
    if (elements.environmentToggle) {
      const buttons = elements.environmentToggle.querySelectorAll('.env-btn');
      buttons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.env === env);
        btn.setAttribute('aria-pressed', btn.dataset.env === env);
      });
    }
  }

  function renderSLA(vendor) {
    const sla = vendor.sla || {};
    if (elements.slaIndicator) {
      const level = sla.level || 'N/A';
      elements.slaIndicator.textContent = level;
      elements.slaIndicator.style.color = getStatusColor(level);
    }
    if (elements.slaUptime) elements.slaUptime.textContent = sla.uptime || 'N/A';
    if (elements.slaResponseTime) elements.slaResponseTime.textContent = sla.responseTime || 'N/A';
    if (elements.supportTier) elements.supportTier.textContent = sla.supportTier || 'N/A';
    if (elements.supportContact) elements.supportContact.textContent = sla.supportContact || 'N/A';
  }

  function renderFallbackVendor(vendor) {
    const fallback = vendor.fallback || {};
    if (elements.fallbackVendor) {
      elements.fallbackVendor.textContent = fallback.name || 'No fallback configured';
      elements.fallbackVendor.style.color = fallback.name ? DESIGN_TOKENS.colors.text : DESIGN_TOKENS.colors.neutral;
    }
    if (elements.fallbackContingency) {
      elements.fallbackContingency.textContent = fallback.contingencyPlan || 'No contingency plan documented';
    }
  }

  function renderUsageMonitoring(vendor) {
    const usage = vendor.usageMonitoring || {};
    if (elements.usageMonitor) {
      const status = usage.enabled ? 'Monitoring active' : 'Monitoring disabled';
      elements.usageMonitor.textContent = status;
      elements.usageMonitor.style.color = usage.enabled ? DESIGN_TOKENS.colors.success : DESIGN_TOKENS.colors.warning;
    }
    if (elements.budgetAlert) {
      const budget = usage.budgetAlert;
      if (budget) {
        elements.budgetAlert.textContent = `Alert at ${formatCurrency(budget.threshold)} (current: ${formatCurrency(budget.current)})`;
        elements.budgetAlert.style.color =
          budget.current >= budget.threshold ? DESIGN_TOKENS.colors.danger : DESIGN_TOKENS.colors.success;
      } else {
        elements.budgetAlert.textContent = 'No budget alert configured';
        elements.budgetAlert.style.color = DESIGN_TOKENS.colors.neutral;
      }
    }
  }

  function renderAll(vendor, credentials) {
    renderVendorHeader(vendor);
    renderContractStatus(vendor);
    renderCredentialStatus(credentials);
    renderEnvironmentConfig(vendor);
    renderSLA(vendor);
    renderFallbackVendor(vendor);
    renderUsageMonitoring(vendor);
    updateLastUpdated();
  }

  // ─── Polling ─────────────────────────────────────────────────────────────────
  function startPolling(vendorId) {
    stopPolling();
    state.pollingIntervalId = setInterval(async () => {
      try {
        const credentials = await fetchCredentialStatus(vendorId);
        state.credentials = credentials;
        renderCredentialStatus(credentials);
        updateLastUpdated();
      } catch (err) {
        console.warn('[VendorDetail] Polling error:', err.message);
        // Don't show error banner for polling failures to avoid UI flicker
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (state.pollingIntervalId) {
      clearInterval(state.pollingIntervalId);
      state.pollingIntervalId = null;
    }
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────────
  function handleEnvironmentToggle(event) {
    const target = event.target.closest('.env-btn');
    if (!target) return;
    const env = target.dataset.env;
    if (env && env !== state.environment) {
      state.environment = env;
      toggleEnvironmentVisibility(env);
    }
  }

  function attachEventListeners() {
    if (elements.environmentToggle) {
      elements.environmentToggle.addEventListener('click', handleEnvironmentToggle);
    }
  }

  // ─── Initialization ──────────────────────────────────────────────────────────
  async function init() {
    cacheDom();
    attachEventListeners();

    // Extract vendor ID from data attribute or URL
    const vendorId =
      document.getElementById('vendor-detail-app')?.dataset?.vendorId ||
      new URLSearchParams(window.location.search).get('vendorId');

    if (!vendorId) {
      showError('No vendor ID specified. Please provide a vendorId parameter.');
      showLoading(false);
      return;
    }

    state.vendorId = vendorId;
    showLoading(true);
    showError(null);

    try {
      const [vendor, credentials] = await Promise.all([
        fetchVendorDetail(vendorId),
        fetchCredentialStatus(vendorId),
      ]);

      state.vendor = vendor;
      state.credentials = credentials;

      renderAll(vendor, credentials);
      startPolling(vendorId);
      showLoading(false);
    } catch (err) {
      showError(err.message || 'Failed to load vendor details. Please try again.');
      showLoading(false);
    }
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────
  function destroy() {
    stopPolling();
    if (elements.environmentToggle) {
      elements.environmentToggle.removeEventListener('click', handleEnvironmentToggle);
    }
  }

  // ─── Export / Public API ─────────────────���───────────────────────────────────
  window.VendorDetail = {
    init,
    destroy,
    refresh: async () => {
      if (state.vendorId) {
        try {
          showLoading(true);
          const [vendor, credentials] = await Promise.all([
            fetchVendorDetail(state.vendorId),
            fetchCredentialStatus(state.vendorId),
          ]);
          state.vendor = vendor;
          state.credentials = credentials;
          renderAll(vendor, credentials);
          showLoading(false);
        } catch (err) {
          showError(err.message);
          showLoading(false);
        }
      }
    },
    setEnvironment: (env) => {
      if (env === 'sandbox' || env === 'production') {
        state.environment = env;
        toggleEnvironmentVisibility(env);
      }
    },
    getState: () => ({ ...state }),
  };

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();