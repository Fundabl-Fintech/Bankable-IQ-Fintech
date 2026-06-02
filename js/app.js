/**
 * js/app.js - VendorOps Core Application Logic
 * State management, data fetching, routing, local storage persistence
 * Spec: Vendor Matrix v1.0 - Engineering Spec Section 18.2
 */

// ============================================================================
// Constants & Configuration
// ============================================================================

const APP_CONFIG = Object.freeze({
  STORAGE_KEY: 'vendorops_state',
  API_BASE: '/api/v1',
  REFRESH_INTERVAL: 300000, // 5 minutes
  VERSION: '1.0.0',
  PHASES: {
    MVP: 'mvp',
    PHASE_2: 'phase2',
    PHASE_3: 'phase3'
  },
  VENDOR_STATUS: {
    ACTIVE: 'active',
    PENDING: 'pending',
    EXPIRED: 'expired',
    NOT_STARTED: 'not_started'
  },
  CONTRACT_STATUS: {
    IN_PLACE: 'in_place',
    NEGOTIATING: 'negotiating',
    RENEWAL_PENDING: 'renewal_pending',
    NOT_STARTED: 'not_started'
  },
  ENVIRONMENTS: {
    SANDBOX: 'sandbox',
    PRODUCTION: 'production'
  },
  ROUTES: {
    DASHBOARD: '/',
    VENDOR_DETAIL: '/vendor/:id',
    MATRIX: '/matrix',
    SETTINGS: '/settings',
    AUDIT_LOG: '/audit'
  }
});

// ============================================================================
// Vendor Matrix Data (Spec 18.2)
// ============================================================================

const VENDOR_MATRIX = Object.freeze({
  mvp: [
    {
      id: 'plaid',
      name: 'Plaid',
      category: 'Financial Data',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-06-15',
      sla: '99.9% uptime, <500ms P99 latency',
      supportTier: 'premium',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/plaid',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://sandbox.plaid.com' },
        production: { configured: true, tested: false, baseUrl: 'https://production.plaid.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 5000,
      monthlySpend: 3200,
      fallbackVendor: 'mx_technologies',
      contingencyPlan: 'MX Technologies for account aggregation; manual fallback to CSV upload',
      phase: 'mvp'
    },
    {
      id: 'equifax',
      name: 'Equifax (Personal Credit Bureau)',
      category: 'Credit Bureau',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-03-01',
      sla: '99.95% uptime, <2s response time',
      supportTier: 'standard',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/equifax',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://sandbox.equifax.com/api' },
        production: { configured: true, tested: true, baseUrl: 'https://api.equifax.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 8000,
      monthlySpend: 6100,
      fallbackVendor: 'experian',
      contingencyPlan: 'Experian as secondary bureau; TransUnion as tertiary',
      phase: 'mvp'
    },
    {
      id: 'dnb',
      name: 'Dun & Bradstreet',
      category: 'Business Data',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-04-30',
      sla: '99.9% uptime, <1s response time',
      supportTier: 'premium',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/dnb',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://sandbox.dnb.com' },
        production: { configured: true, tested: false, baseUrl: 'https://api.dnb.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 6000,
      monthlySpend: 4200,
      fallbackVendor: 'lexisnexis',
      contingencyPlan: 'LexisNexis Risk Solutions for business verification fallback',
      phase: 'mvp'
    },
    {
      id: 'auth0',
      name: 'Auth0',
      category: 'Identity & Auth',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-07-01',
      sla: '99.99% uptime, <200ms auth latency',
      supportTier: 'enterprise',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/auth0',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://dev-xxx.us.auth0.com' },
        production: { configured: true, tested: true, baseUrl: 'https://login.vendorops.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 3000,
      monthlySpend: 1800,
      fallbackVendor: 'aws_cognito',
      contingencyPlan: 'AWS Cognito as fallback; manual auth via OTP if both down',
      phase: 'mvp'
    },
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'Payments',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-08-15',
      sla: '99.99% uptime, <100ms API latency',
      supportTier: 'premium',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/stripe',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.stripe.com/v1' },
        production: { configured: true, tested: true, baseUrl: 'https://api.stripe.com/v1' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 10000,
      monthlySpend: 7500,
      fallbackVendor: 'braintree',
      contingencyPlan: 'Braintree/PayPal as payment fallback; manual invoicing as last resort',
      phase: 'mvp'
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      category: 'AI/ML',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-05-01',
      sla: '99.5% uptime, <3s response time',
      supportTier: 'standard',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/anthropic',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.anthropic.com/v1' },
        production: { configured: true, tested: false, baseUrl: 'https://api.anthropic.com/v1' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 4000,
      monthlySpend: 2800,
      fallbackVendor: 'openai',
      contingencyPlan: 'OpenAI GPT-4 as fallback; local model inference as tertiary',
      phase: 'mvp'
    },
    {
      id: 'vercel',
      name: 'Vercel',
      category: 'Hosting/Deployment',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-09-01',
      sla: '99.99% uptime, <50ms edge latency',
      supportTier: 'enterprise',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/vercel',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.vercel.com' },
        production: { configured: true, tested: true, baseUrl: 'https://api.vercel.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 5000,
      monthlySpend: 3500,
      fallbackVendor: 'netlify',
      contingencyPlan: 'Netlify for static hosting; AWS CloudFront + S3 as backup',
      phase: 'mvp'
    },
    {
      id: 'aws',
      name: 'AWS',
      category: 'Cloud Infrastructure',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-12-31',
      sla: '99.99% compute, 99.999% data plane',
      supportTier: 'enterprise',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/aws',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.aws.com' },
        production: { configured: true, tested: true, baseUrl: 'https://api.aws.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 50000,
      monthlySpend: 38500,
      fallbackVendor: 'gcp',
      contingencyPlan: 'GCP as secondary cloud; Azure as tertiary for critical workloads',
      phase: 'mvp'
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      category: 'CDN/Security',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-10-01',
      sla: '100% uptime SLA, <10ms edge latency',
      supportTier: 'enterprise',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/cloudflare',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.cloudflare.com' },
        production: { configured: true, tested: true, baseUrl: 'https://api.cloudflare.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 3000,
      monthlySpend: 2000,
      fallbackVendor: 'fastly',
      contingencyPlan: 'Fastly for CDN; AWS CloudFront as secondary fallback',
      phase: 'mvp'
    },
    {
      id: 'datadog',
      name: 'Datadog',
      category: 'Monitoring/Observability',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-11-01',
      sla: '99.9% uptime, <30s data ingestion delay',
      supportTier: 'premium',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/datadog',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.datadoghq.com' },
        production: { configured: true, tested: true, baseUrl: 'https://api.datadoghq.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 4000,
      monthlySpend: 3100,
      fallbackVendor: 'new_relic',
      contingencyPlan: 'New Relic as fallback; Grafana + Prometheus self-hosted as tertiary',
      phase: 'mvp'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      category: 'Email Service',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-02-28',
      sla: '99.9% delivery rate, <5min send latency',
      supportTier: 'standard',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/sendgrid',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.sendgrid.com/v3' },
        production: { configured: true, tested: true, baseUrl: 'https://api.sendgrid.com/v3' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 2000,
      monthlySpend: 1200,
      fallbackVendor: 'aws_ses',
      contingencyPlan: 'AWS SES as fallback; Mailgun as tertiary for transactional emails',
      phase: 'mvp'
    },
    {
      id: 'twilio',
      name: 'Twilio',
      category: 'Communications',
      priority: 'MVP',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-06-30',
      sla: '99.95% uptime, <100ms SMS delivery',
      supportTier: 'premium',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/twilio',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://api.twilio.com' },
        production: { configured: true, tested: true, baseUrl: 'https://api.twilio.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 3000,
      monthlySpend: 2100,
      fallbackVendor: 'vonage',
      contingencyPlan: 'Vonage (Nexmo) for SMS; AWS SNS for push notifications fallback',
      phase: 'mvp'
    }
  ],
  phase2: [
    {
      id: 'snowflake',
      name: 'Snowflake',
      category: 'Data Warehouse',
      priority: 'Phase 2',
      contractStatus: 'negotiating',
      contractRenewalDate: '2026-03-01',
      sla: '99.9% uptime, <1s query P50',
      supportTier: 'standard',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/snowflake',
      environments: {
        sandbox: { configured: false, tested: false, baseUrl: '' },
        production: { configured: false, tested: false, baseUrl: '' }
      },
      usageMonitoring: false,
      budgetAlertThreshold: 15000,
      monthlySpend: 0,
      fallbackVendor: 'bigquery',
      contingencyPlan: 'Google BigQuery as fallback; Redshift as tertiary',
      phase: 'phase2'
    },
    {
      id: 'pinecone',
      name: 'Pinecone',
      category: 'Vector Database',
      priority: 'Phase 2',
      contractStatus: 'negotiating',
      contractRenewalDate: '2026-04-01',
      sla: '99.9% uptime, <50ms query latency',
      supportTier: 'standard',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/pinecone',
      environments: {
        sandbox: { configured: false, tested: false, baseUrl: '' },
        production: { configured: false, tested: false, baseUrl: '' }
      },
      usageMonitoring: false,
      budgetAlertThreshold: 5000,
      monthlySpend: 0,
      fallbackVendor: 'weaviate',
      contingencyPlan: 'Weaviate self-hosted; pgvector as tertiary fallback',
      phase: 'phase2'
    },
    {
      id: 'temporal',
      name: 'Temporal Cloud',
      category: 'Workflow Engine',
      priority: 'Phase 2',
      contractStatus: 'negotiating',
      contractRenewalDate: '2026-05-01',
      sla: '99.95% uptime, <100ms task dispatch',
      supportTier: 'standard',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/temporal',
      environments: {
        sandbox: { configured: false, tested: false, baseUrl: '' },
        production: { configured: false, tested: false, baseUrl: '' }
      },
      usageMonitoring: false,
      budgetAlertThreshold: 4000,
      monthlySpend: 0,
      fallbackVendor: 'aws_step_functions',
      contingencyPlan: 'AWS Step Functions as fallback; Airflow as tertiary',
      phase: 'phase2'
    },
    {
      id: 'textract',
      name: 'AWS Textract',
      category: 'Document Processing',
      priority: 'Phase 2',
      contractStatus: 'in_place',
      contractRenewalDate: '2026-12-31',
      sla: '99.9% uptime, <5s per page',
      supportTier: 'standard',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/textract',
      environments: {
        sandbox: { configured: true, tested: true, baseUrl: 'https://textract.us-east-1.amazonaws.com' },
        production: { configured: true, tested: false, baseUrl: 'https://textract.us-east-1.amazonaws.com' }
      },
      usageMonitoring: true,
      budgetAlertThreshold: 3000,
      monthlySpend: 800,
      fallbackVendor: 'google_document_ai',
      contingencyPlan: 'Google Document AI; Azure Form Recognizer as tertiary',
      phase: 'phase2'
    },
    {
      id: 'transunion',
      name: 'TransUnion',
      category: 'Credit Bureau',
      priority: 'Phase 2',
      contractStatus: 'not_started',
      contractRenewalDate: '2026-06-01',
      sla: '99.9% uptime, <3s response time',
      supportTier: 'standard',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/transunion',
      environments: {
        sandbox: { configured: false, tested: false, baseUrl: '' },
        production: { configured: false, tested: false, baseUrl: '' }
      },
      usageMonitoring: false,
      budgetAlertThreshold: 5000,
      monthlySpend: 0,
      fallbackVendor: 'equifax',
      contingencyPlan