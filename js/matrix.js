// js/matrix.js
// Vendor Matrix Rendering Engine
// Builds table from vendor data, handles sorting, filtering, status calculations

/**
 * @typedef {Object} Vendor
 * @property {string} id - Unique vendor identifier
 * @property {string} name - Vendor display name
 * @property {'mvp'|'phase2'|'phase3'} phase - Implementation phase
 * @property {'active'|'pending'|'expired'|'none'} contractStatus - Contract or MSA status
 * @property {string|null} contractRenewalDate - ISO date string of next renewal
 * @property {boolean} credentialsProvisioned - API credentials in Secrets Manager
 * @property {boolean} sandboxConfigured - Sandbox environment configured
 * @property {boolean} productionConfigured - Production environment configured
 * @property {'tier1'|'tier2'|'tier3'|'none'} slaTier - Support SLA tier
 * @property {string|null} fallbackVendor - Fallback vendor name
 * @property {boolean} contingencyPlan - Contingency plan documented
 * @property {boolean} usageMonitoring - Usage monitoring configured
 * @property {boolean} budgetAlert - Budget alert configured
 * @property {number|null} monthlyBudget - Monthly budget in USD
 * @property {number|null} currentSpend - Current month spend in USD
 */

/**
 * @typedef {'contract'|'credentials'|'sandbox'|'production'|'sla'|'fallback'|'contingency'|'monitoring'|'budget'} ColumnKey
 */

/**
 * @typedef {Object} SortConfig
 * @property {ColumnKey} column - Column to sort by
 * @property {'asc'|'desc'} direction - Sort direction
 */

/**
 * @typedef {Object} FilterConfig
 * @property {string|null} search - Search text filter
 * @property {'mvp'|'phase2'|'phase3'|'all'} phase - Phase filter
 * @property {'all'|'ready'|'attention'|'critical'} status - Overall status filter
 */

// ─── Default Vendor Data ─────────────────────────────────────────────────────

/** @type {Vendor[]} */
const DEFAULT_VENDORS = [
  // ── MVP Phase ──
  {
    id: 'plaid',
    name: 'Plaid',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-06-15',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'Finicity (Mastercard)',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 5000,
    currentSpend: 3200,
  },
  {
    id: 'credit-bureau-1',
    name: 'Experian',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-03-01',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'TransUnion',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 8000,
    currentSpend: 6100,
  },
  {
    id: 'dnb',
    name: 'Dun & Bradstreet',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-09-30',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: false,
    slaTier: 'tier2',
    fallbackVendor: 'Moody\'s Analytics',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 12000,
    currentSpend: 4500,
  },
  {
    id: 'auth0',
    name: 'Auth0',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-12-31',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'Clerk',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 3000,
    currentSpend: 1800,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2027-01-15',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'Braintree (PayPal)',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 15000,
    currentSpend: 9800,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-08-01',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'OpenAI',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 10000,
    currentSpend: 7200,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-11-30',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier2',
    fallbackVendor: 'Netlify',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 4000,
    currentSpend: 2100,
  },
  {
    id: 'aws',
    name: 'AWS',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2027-04-01',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'GCP',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 50000,
    currentSpend: 38200,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-10-15',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'Fastly',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 3000,
    currentSpend: 1400,
  },
  {
    id: 'datadog',
    name: 'Datadog',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-07-01',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'New Relic',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 8000,
    currentSpend: 5600,
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-05-20',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier2',
    fallbackVendor: 'AWS SES',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 2000,
    currentSpend: 1100,
  },
  {
    id: 'twilio',
    name: 'Twilio',
    phase: 'mvp',
    contractStatus: 'active',
    contractRenewalDate: '2026-08-31',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: true,
    slaTier: 'tier1',
    fallbackVendor: 'Vonage',
    contingencyPlan: true,
    usageMonitoring: true,
    budgetAlert: true,
    monthlyBudget: 6000,
    currentSpend: 3900,
  },
  // ── Phase 2 ──
  {
    id: 'snowflake',
    name: 'Snowflake',
    phase: 'phase2',
    contractStatus: 'pending',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'BigQuery',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    phase: 'phase2',
    contractStatus: 'pending',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'Weaviate',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  {
    id: 'temporal',
    name: 'Temporal Cloud',
    phase: 'phase2',
    contractStatus: 'pending',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'AWS Step Functions',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  {
    id: 'textract',
    name: 'Amazon Textract',
    phase: 'phase2',
    contractStatus: 'active',
    contractRenewalDate: '2027-04-01',
    credentialsProvisioned: true,
    sandboxConfigured: true,
    productionConfigured: false,
    slaTier: 'tier3',
    fallbackVendor: 'Google Document AI',
    contingencyPlan: false,
    usageMonitoring: true,
    budgetAlert: false,
    monthlyBudget: 2000,
    currentSpend: 300,
  },
  {
    id: 'credit-bureau-2',
    name: 'TransUnion',
    phase: 'phase2',
    contractStatus: 'pending',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'Equifax',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  {
    id: 'credit-bureau-3',
    name: 'Equifax',
    phase: 'phase2',
    contractStatus: 'pending',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'Experian',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  // ── Phase 3 ──
  {
    id: 'docusign',
    name: 'DocuSign',
    phase: 'phase3',
    contractStatus: 'none',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'HelloSign',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  {
    id: 'hackerone',
    name: 'HackerOne',
    phase: 'phase3',
    contractStatus: 'none',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'Bugcrowd',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
  {
    id: 'bugcrowd',
    name: 'Bugcrowd',
    phase: 'phase3',
    contractStatus: 'none',
    contractRenewalDate: null,
    credentialsProvisioned: false,
    sandboxConfigured: false,
    productionConfigured: false,
    slaTier: 'none',
    fallbackVendor: 'HackerOne',
    contingencyPlan: false,
    usageMonitoring: false,
    budgetAlert: false,
    monthlyBudget: null,
    currentSpend: null,
  },
];

// ─── Status Calculation ──────────────────────────────────────────────────────

/**
 * Calculate overall readiness status for a vendor
 * @param {Vendor} vendor
 * @returns {'ready'|'attention'|'critical'}
 */
function calculateVendorStatus(vendor) {
  const issues = [];

  if (vendor.contractStatus === 'none' || vendor.contractStatus === 'expired') {
    issues.push('contract');
  } else if (vendor.contractStatus === 'pending') {
    issues.push('contract-pending');
  }

  if (!vendor.credentialsProvisioned) issues.push('credentials');
  if (!vendor.sandboxConfigured) issues.push('sandbox');
  if (!vendor.productionConfigured) issues.push('production');
  if (vendor.slaTier === 'none') issues.push('sla');
  if (!vendor.fallbackVendor) issues.push('fallback');
  if (!vendor.contingencyPlan) issues.push('contingency');
  if (!vendor.usageMonitoring) issues.push('monitoring');
  if (!vendor.budgetAlert) issues.push('budget');

  if (issues.length === 0) return 'ready';
  if (issues.length <= 3) return 'attention';
  return 'critical';
}

/**
 * Calculate status for a specific column
 * @param {Vendor} vendor
 * @param {ColumnKey} column
 * @returns {'success'|'warning'|'danger'|'neutral'}
 */
function calculateColumnStatus(vendor, column) {
  switch (column) {
    case 'contract':
      if (vendor.contractStatus === 'active') return 'success';
      if (vendor.contractStatus === 'pending') return 'warning';
      if (vendor.contractStatus === 'expired') return 'danger';
      return 'neutral';
    case 'credentials':
      return vendor.credentialsProvisioned ? 'success' : 'danger';
    case 'sandbox':
      return vendor.sandboxConfigured ? 'success' : 'danger';
    case 'production':
      return vendor.productionConfigured ? 'success' : 'warning';
    case 'sla':
      if (vendor.slaTier === 'tier1') return 'success';
      if (vendor.slaTier === 'tier2') return 'warning';
      if (vendor.slaTier === 'tier3') return 'warning';
      return 'neutral';
    case 'fallback':
      return vendor.fallbackVendor ? 'success' : 'warning';
    case 'contingency':
      return vendor.contingencyPlan ? 'success' : 'danger';
    case 'monitoring':
      return vendor.usageMonitoring ? 'success' : 'danger';
    case 'budget':
      return vendor.budgetAlert ? 'success' : 'warning';
    default:
      return 'neutral';
  }
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

/**
 * Sort vendors based on configuration
 * @param {Vendor[]} vendors
 * @param {SortConfig} sort
 * @returns {Vendor[]}
 */
function sortVendors(vendors, sort) {
  const sorted = [...vendors];
  const { column, direction } = sort;
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (column) {
      case 'contract':
        const statusOrder = { active: 0, pending: 1, expired: 2, none: 3 };
        comparison = (statusOrder[a.contractStatus] ?? 99) - (statusOrder[b.contractStatus] ?? 99);
        break;
      case 'credentials':
        comparison = Number(b.credentialsProvisioned) - Number(a.credentialsProvisioned);
        break;
      case 'sandbox':
        comparison = Number(b.sandboxConfigured) - Number(a.sandboxConfigured);
        break;
      case 'production':
        comparison = Number(b.productionConfigured) - Number(a.productionConfigured);
        break;
      case 'sla':
        const slaOrder = { tier1: 0, tier2: 1, tier3: 2, none: 3 };
        comparison = (slaOrder[a.slaTier] ?? 99) - (slaOrder[b.slaTier] ?? 99);
        break;
      case 'fallback':
        comparison = (a.fallbackVendor || '').localeCompare(b.fallbackVendor || '');
        break;
      case 'contingency':
        comparison = Number(b.contingencyPlan)