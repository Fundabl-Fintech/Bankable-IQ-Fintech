/**
 * js/utils.js
 * Utility functions for VendorOps - date formatting, status color mapping,
 * API mock data, and localStorage helpers.
 * 
 * Design System: VendorOps Design System v1.0.0
 * Architecture: Web
 * Dependencies: None (vanilla JS)
 */

// ─── Date Formatting ───────────────────────────────────────────────────────────

/**
 * Format a date to a human-readable string.
 * @param {Date|string|number} date - Date object, ISO string, or timestamp.
 * @param {Intl.DateTimeFormatOptions} [options] - Override default formatting options.
 * @returns {string} Formatted date string.
 */
export function formatDate(date, options = {}) {
  if (date == null) return '—';
  
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';

  const defaults = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  };

  return new Intl.DateTimeFormat('en-US', { ...defaults, ...options }).format(d);
}

/**
 * Format a date with time (HH:MM UTC).
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatDateTime(date) {
  return formatDate(date, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  });
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 * @param {Date|string|number} date
 * @returns {string}
 */
export function formatISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date';
  return d.toISOString().split('T')[0];
}

/**
 * Calculate days remaining until a target date.
 * @param {Date|string|number} targetDate
 * @returns {number} Days remaining (negative if past).
 */
export function daysUntil(targetDate) {
  const now = new Date();
  const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get a relative time string (e.g., "2 days ago", "in 3 months").
 * @param {Date|string|number} date
 * @returns {string}
 */
export function relativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const absDays = Math.abs(diffDays);

  if (absDays === 0) return 'Today';
  if (absDays === 1) return diffDays > 0 ? 'Tomorrow' : 'Yesterday';
  if (absDays < 7) return diffDays > 0 ? `In ${absDays} days` : `${absDays} days ago`;
  if (absDays < 30) {
    const weeks = Math.floor(absDays / 7);
    return diffDays > 0 ? `In ${weeks} week${weeks > 1 ? 's' : ''}` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (absDays < 365) {
    const months = Math.floor(absDays / 30);
    return diffDays > 0 ? `In ${months} month${months > 1 ? 's' : ''}` : `${months} month${months > 1 ? 's' : ''} ago`;
  }
  const years = Math.floor(absDays / 365);
  return diffDays > 0 ? `In ${years} year${years > 1 ? 's' : ''}` : `${years} year${years > 1 ? 's' : ''} ago`;
}

// ─── Status Color Mapping ──────────────────────────────────────────────────────

/**
 * Status types used across the vendor matrix.
 * Maps to design system color palette.
 */
export const STATUS_TYPES = {
  ACTIVE: 'active',
  PENDING: 'pending',
  EXPIRED: 'expired',
  WARNING: 'warning',
  ERROR: 'error',
  NOT_CONFIGURED: 'not_configured',
  COMPLIANT: 'compliant',
  NON_COMPLIANT: 'non_compliant',
  REVIEW: 'review',
};

/**
 * Get the color hex value for a given status.
 * @param {string} status - One of STATUS_TYPES values.
 * @returns {string} Hex color code.
 */
export function getStatusColor(status) {
  const colorMap = {
    [STATUS_TYPES.ACTIVE]: '#0f9d58',        // success
    [STATUS_TYPES.PENDING]: '#f4b400',        // warning
    [STATUS_TYPES.EXPIRED]: '#ea4335',        // danger
    [STATUS_TYPES.WARNING]: '#f4b400',        // warning
    [STATUS_TYPES.ERROR]: '#ea4335',          // danger
    [STATUS_TYPES.NOT_CONFIGURED]: '#5f6368', // neutral
    [STATUS_TYPES.COMPLIANT]: '#0f9d58',      // success
    [STATUS_TYPES.NON_COMPLIANT]: '#ea4335',  // danger
    [STATUS_TYPES.REVIEW]: '#1a73e8',         // primary
  };
  return colorMap[status] || '#5f6368';
}

/**
 * Get a human-readable label for a status.
 * @param {string} status
 * @returns {string}
 */
export function getStatusLabel(status) {
  const labelMap = {
    [STATUS_TYPES.ACTIVE]: 'Active',
    [STATUS_TYPES.PENDING]: 'Pending',
    [STATUS_TYPES.EXPIRED]: 'Expired',
    [STATUS_TYPES.WARNING]: 'Warning',
    [STATUS_TYPES.ERROR]: 'Error',
    [STATUS_TYPES.NOT_CONFIGURED]: 'Not Configured',
    [STATUS_TYPES.COMPLIANT]: 'Compliant',
    [STATUS_TYPES.NON_COMPLIANT]: 'Non-Compliant',
    [STATUS_TYPES.REVIEW]: 'Under Review',
  };
  return labelMap[status] || 'Unknown';
}

/**
 * Get CSS class suffix for a status (for use with design system classes).
 * @param {string} status
 * @returns {string}
 */
export function getStatusClass(status) {
  const classMap = {
    [STATUS_TYPES.ACTIVE]: 'status-active',
    [STATUS_TYPES.PENDING]: 'status-pending',
    [STATUS_TYPES.EXPIRED]: 'status-expired',
    [STATUS_TYPES.WARNING]: 'status-warning',
    [STATUS_TYPES.ERROR]: 'status-error',
    [STATUS_TYPES.NOT_CONFIGURED]: 'status-not-configured',
    [STATUS_TYPES.COMPLIANT]: 'status-compliant',
    [STATUS_TYPES.NON_COMPLIANT]: 'status-non-compliant',
    [STATUS_TYPES.REVIEW]: 'status-review',
  };
  return classMap[status] || 'status-unknown';
}

// ─── API Mock Data ─────────────────────────────────────────────────────────────

/**
 * Mock vendor matrix data based on spec requirements.
 * MVP vendors, Phase 2, and Phase 3 additions.
 */
export const MOCK_VENDOR_MATRIX = [
  // ── MVP Priority Vendors ──────────────────────────────────────────────────
  {
    id: 'plaid',
    name: 'Plaid',
    phase: 'MVP',
    category: 'Financial Data',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-12-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: false,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'Finicity (Mastercard)',
    contingencyPlan: 'Manual financial data entry via CSV upload; Finicity integration in progress.',
    usageMonitoring: true,
    budgetAlertThreshold: 5000,
    monthlyBudget: 10000,
    notes: 'Primary open banking API. Contract renewed Q1 2026.',
  },
  {
    id: 'credit-bureau',
    name: 'Personal Credit Bureau (Experian)',
    phase: 'MVP',
    category: 'Credit Data',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-09-30',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Standard',
    supportTier: 'Standard',
    fallbackVendor: 'TransUnion',
    contingencyPlan: 'Switch to TransUnion API within 48 hours; batch processing fallback.',
    usageMonitoring: true,
    budgetAlertThreshold: 3000,
    monthlyBudget: 8000,
    notes: 'Experian as primary bureau. TransUnion and Equifax for Phase 2.',
  },
  {
    id: 'dnb',
    name: 'Dun & Bradstreet (D&B)',
    phase: 'MVP',
    category: 'Business Credit',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-11-15',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'CreditSafe',
    contingencyPlan: 'CreditSafe API as backup; manual business verification via SOS filings.',
    usageMonitoring: true,
    budgetAlertThreshold: 4000,
    monthlyBudget: 12000,
    notes: 'Business credit and entity resolution. DUNS number integration.',
  },
  {
    id: 'auth0',
    name: 'Auth0 (Okta)',
    phase: 'MVP',
    category: 'Authentication',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2027-01-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'AWS Cognito',
    contingencyPlan: 'Failover to Cognito with pre-configured user pool; 1-hour RTO.',
    usageMonitoring: true,
    budgetAlertThreshold: 2000,
    monthlyBudget: 5000,
    notes: 'Universal login, MFA, and RBAC. SSO integration complete.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    phase: 'MVP',
    category: 'Payments',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-10-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'Braintree (PayPal)',
    contingencyPlan: 'Braintree integration tested; manual payment processing via virtual terminal.',
    usageMonitoring: true,
    budgetAlertThreshold: 10000,
    monthlyBudget: 25000,
    notes: 'Payment processing, subscriptions, and marketplace payouts.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    phase: 'MVP',
    category: 'AI/ML',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-08-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: false,
    slaTier: 'Standard',
    supportTier: 'Standard',
    fallbackVendor: 'OpenAI (GPT-4)',
    contingencyPlan: 'Fallback to OpenAI API with prompt translation layer; local model inference.',
    usageMonitoring: true,
    budgetAlertThreshold: 5000,
    monthlyBudget: 15000,
    notes: 'Claude API for document analysis and underwriting assistance.',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    phase: 'MVP',
    category: 'Hosting/Deployment',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-12-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'AWS Amplify',
    contingencyPlan: 'Amplify deployment pipeline configured; DNS switch under 30 minutes.',
    usageMonitoring: true,
    budgetAlertThreshold: 3000,
    monthlyBudget: 8000,
    notes: 'Frontend hosting, serverless functions, and preview deployments.',
  },
  {
    id: 'aws',
    name: 'AWS',
    phase: 'MVP',
    category: 'Cloud Infrastructure',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2027-03-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Enterprise',
    fallbackVendor: 'GCP',
    contingencyPlan: 'Multi-cloud strategy with GCP as secondary; critical workloads only.',
    usageMonitoring: true,
    budgetAlertThreshold: 50000,
    monthlyBudget: 150000,
    notes: 'Primary cloud provider. ECS, RDS, S3, Lambda, Secrets Manager.',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    phase: 'MVP',
    category: 'CDN/Security',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-11-30',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'AWS CloudFront + WAF',
    contingencyPlan: 'CloudFront distribution pre-configured; WAF rules synchronized.',
    usageMonitoring: true,
    budgetAlertThreshold: 2000,
    monthlyBudget: 5000,
    notes: 'CDN, DDoS protection, DNS, and Workers.',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    phase: 'MVP',
    category: 'Monitoring/Observability',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-10-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'New Relic',
    contingencyPlan: 'New Relic agent installed; dashboards duplicated for critical metrics.',
    usageMonitoring: true,
    budgetAlertThreshold: 4000,
    monthlyBudget: 10000,
    notes: 'APM, logs, infrastructure monitoring, and alerting.',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid (Twilio)',
    phase: 'MVP',
    category: 'Email Service',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-09-30',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Standard',
    supportTier: 'Standard',
    fallbackVendor: 'AWS SES',
    contingencyPlan: 'SES configured as secondary; DKIM/SPF records pre-published.',
    usageMonitoring: true,
    budgetAlertThreshold: 1000,
    monthlyBudget: 3000,
    notes: 'Transactional emails, notifications, and marketing campaigns.',
  },
  {
    id: 'twilio',
    name: 'Twilio',
    phase: 'MVP',
    category: 'Communications',
    contractStatus: STATUS_TYPES.ACTIVE,
    contractEndDate: '2026-12-31',
    apiCredentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'Enterprise',
    supportTier: 'Premium',
    fallbackVendor: 'Vonage (Nexmo)',
    contingencyPlan: 'Vonage API integration tested; SMS/voice fallback within 1 hour.',
    usageMonitoring: true,
    budgetAlertThreshold: 3000,
    monthlyBudget: 8000,
    notes: 'SMS, voice, and WhatsApp for customer communications.',
  },

  // ── Phase 2 Additions ─────────────────────────────────────────────────────
  {
    id: 'snowflake',
    name: 'Snowflake',
    phase: 'Phase 2',
    category: 'Data Warehouse',
    contractStatus: STATUS_TYPES.PENDING,
    contractEndDate: '2027-06-30',
    apiCredentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'Standard',
    supportTier: 'Standard',
    fallbackVendor: 'AWS Redshift',
    contingencyPlan: 'Redshift cluster available; ETL pipelines dual-target.',
    usageMonitoring: false,
    budgetAlertThreshold: 10000,
    monthlyBudget: 30000,
    notes: 'Planned for Q3 2026. Contract negotiation in progress.',
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    phase: 'Phase 2',
    category: 'Vector Database',
    contractStatus: STATUS_TYPES.PENDING,
    contractEndDate: '2027-04-30',
    apiCredentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'Standard',
    supportTier: 'Standard',
    fallbackVendor: 'Weaviate (self-hosted)',
    contingencyPlan: 'Self-hosted Weaviate cluster; Milvus as tertiary option.',
    usageMonitoring: false,
    budgetAlertThreshold: 2000,
    monthlyBudget: 5000,
    notes: 'Vector search for document similarity