// js/runbook.js
// Runbook functionality - calendar generation, renewal date calculations, audit log, CSV/PDF export

'use strict';

const VENDOR_MATRIX = {
  mvp: [
    {
      id: 'plaid',
      name: 'Plaid',
      category: 'Financial Data',
      contractStatus: 'active',
      contractStart: '2025-01-15',
      contractEnd: '2026-01-14',
      renewalType: 'annual',
      supportTier: 'premium',
      sla: '99.9%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/plaid',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 5000,
      monthlyBudget: 3000,
      fallbackVendor: 'mx_technologies',
      contingencyPlan: 'MX Technologies for alternative financial data aggregation',
      notes: 'Primary data aggregation partner for MVP'
    },
    {
      id: 'credit_bureau',
      name: 'Personal Credit Bureau',
      category: 'Credit Data',
      contractStatus: 'active',
      contractStart: '2025-02-01',
      contractEnd: '2026-01-31',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/credit_bureau',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 8000,
      monthlyBudget: 5000,
      fallbackVendor: 'experian',
      contingencyPlan: 'Experian as secondary credit data provider',
      notes: 'Primary bureau for credit pulls'
    },
    {
      id: 'dnb',
      name: 'Dun & Bradstreet',
      category: 'Business Data',
      contractStatus: 'active',
      contractStart: '2025-03-01',
      contractEnd: '2026-02-28',
      renewalType: 'annual',
      supportTier: 'premium',
      sla: '99.9%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/dnb',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 10000,
      monthlyBudget: 6000,
      fallbackVendor: 'lexisnexis',
      contingencyPlan: 'LexisNexis Risk Solutions for business verification',
      notes: 'Business entity verification and DUNS number management'
    },
    {
      id: 'auth0',
      name: 'Auth0',
      category: 'Authentication',
      contractStatus: 'active',
      contractStart: '2025-01-01',
      contractEnd: '2025-12-31',
      renewalType: 'annual',
      supportTier: 'enterprise',
      sla: '99.99%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/auth0',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 15000,
      monthlyBudget: 10000,
      fallbackVendor: 'okta',
      contingencyPlan: 'Okta for identity management fallback',
      notes: 'Primary identity and access management platform'
    },
    {
      id: 'stripe',
      name: 'Stripe',
      category: 'Payments',
      contractStatus: 'active',
      contractStart: '2025-01-01',
      contractEnd: '2026-01-01',
      renewalType: 'annual',
      supportTier: 'premium',
      sla: '99.99%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/stripe',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 50000,
      monthlyBudget: 30000,
      fallbackVendor: 'adyen',
      contingencyPlan: 'Adyen for payment processing redundancy',
      notes: 'Core payment processing and subscription management'
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      category: 'AI/ML',
      contractStatus: 'active',
      contractStart: '2025-04-01',
      contractEnd: '2026-03-31',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/anthropic',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 20000,
      monthlyBudget: 12000,
      fallbackVendor: 'openai',
      contingencyPlan: 'OpenAI GPT-4 for LLM capabilities',
      notes: 'Claude API for AI-powered features'
    },
    {
      id: 'vercel',
      name: 'Vercel',
      category: 'Hosting/Deployment',
      contractStatus: 'active',
      contractStart: '2025-01-01',
      contractEnd: '2025-12-31',
      renewalType: 'annual',
      supportTier: 'enterprise',
      sla: '99.99%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/vercel',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 25000,
      monthlyBudget: 15000,
      fallbackVendor: 'netlify',
      contingencyPlan: 'Netlify for static hosting and serverless functions',
      notes: 'Frontend hosting and deployment pipeline'
    },
    {
      id: 'aws',
      name: 'AWS',
      category: 'Cloud Infrastructure',
      contractStatus: 'active',
      contractStart: '2025-01-01',
      contractEnd: '2026-01-01',
      renewalType: 'annual',
      supportTier: 'enterprise',
      sla: '99.99%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/aws',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 100000,
      monthlyBudget: 75000,
      fallbackVendor: 'gcp',
      contingencyPlan: 'Google Cloud Platform for infrastructure redundancy',
      notes: 'Primary cloud provider for all backend services'
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare',
      category: 'CDN/Security',
      contractStatus: 'active',
      contractStart: '2025-01-01',
      contractEnd: '2025-12-31',
      renewalType: 'annual',
      supportTier: 'enterprise',
      sla: '99.99%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/cloudflare',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 15000,
      monthlyBudget: 10000,
      fallbackVendor: 'fastly',
      contingencyPlan: 'Fastly for CDN and DDoS protection',
      notes: 'CDN, DNS, and security services'
    },
    {
      id: 'datadog',
      name: 'Datadog',
      category: 'Monitoring',
      contractStatus: 'active',
      contractStart: '2025-02-01',
      contractEnd: '2026-01-31',
      renewalType: 'annual',
      supportTier: 'premium',
      sla: '99.9%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/datadog',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 20000,
      monthlyBudget: 12000,
      fallbackVendor: 'new_relic',
      contingencyPlan: 'New Relic for APM and observability',
      notes: 'Infrastructure and application monitoring'
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      category: 'Email',
      contractStatus: 'active',
      contractStart: '2025-01-15',
      contractEnd: '2026-01-14',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/sendgrid',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 5000,
      monthlyBudget: 3000,
      fallbackVendor: 'ses',
      contingencyPlan: 'Amazon SES for email delivery fallback',
      notes: 'Transactional email service'
    },
    {
      id: 'twilio',
      name: 'Twilio',
      category: 'Communications',
      contractStatus: 'active',
      contractStart: '2025-02-01',
      contractEnd: '2026-01-31',
      renewalType: 'annual',
      supportTier: 'premium',
      sla: '99.95%',
      apiCredentialsProvisioned: true,
      secretsManagerPath: '/prod/vendors/twilio',
      sandboxConfigured: true,
      productionConfigured: true,
      usageMonitoring: true,
      budgetAlertThreshold: 10000,
      monthlyBudget: 6000,
      fallbackVendor: 'vonage',
      contingencyPlan: 'Vonage for SMS and voice fallback',
      notes: 'SMS, voice, and communication APIs'
    }
  ],
  phase2: [
    {
      id: 'snowflake',
      name: 'Snowflake',
      category: 'Data Warehouse',
      contractStatus: 'pending',
      contractStart: '2025-07-01',
      contractEnd: '2026-06-30',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.9%',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/snowflake',
      sandboxConfigured: false,
      productionConfigured: false,
      usageMonitoring: false,
      budgetAlertThreshold: 30000,
      monthlyBudget: 20000,
      fallbackVendor: 'redshift',
      contingencyPlan: 'Amazon Redshift for data warehousing',
      notes: 'Phase 2 - Data analytics platform'
    },
    {
      id: 'pinecone',
      name: 'Pinecone',
      category: 'Vector Database',
      contractStatus: 'pending',
      contractStart: '2025-07-01',
      contractEnd: '2026-06-30',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/pinecone',
      sandboxConfigured: false,
      productionConfigured: false,
      usageMonitoring: false,
      budgetAlertThreshold: 10000,
      monthlyBudget: 5000,
      fallbackVendor: 'weaviate',
      contingencyPlan: 'Weaviate for vector search capabilities',
      notes: 'Phase 2 - Vector embeddings and similarity search'
    },
    {
      id: 'temporal',
      name: 'Temporal Cloud',
      category: 'Workflow Engine',
      contractStatus: 'pending',
      contractStart: '2025-08-01',
      contractEnd: '2026-07-31',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.9%',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/temporal',
      sandboxConfigured: false,
      productionConfigured: false,
      usageMonitoring: false,
      budgetAlertThreshold: 15000,
      monthlyBudget: 8000,
      fallbackVendor: 'aws_step_functions',
      contingencyPlan: 'AWS Step Functions for workflow orchestration',
      notes: 'Phase 2 - Workflow orchestration'
    },
    {
      id: 'textract',
      name: 'Amazon Textract',
      category: 'Document Processing',
      contractStatus: 'pending',
      contractStart: '2025-07-01',
      contractEnd: '2026-06-30',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/textract',
      sandboxConfigured: false,
      productionConfigured: false,
      usageMonitoring: false,
      budgetAlertThreshold: 8000,
      monthlyBudget: 4000,
      fallbackVendor: 'google_document_ai',
      contingencyPlan: 'Google Document AI for OCR and document parsing',
      notes: 'Phase 2 - Document extraction and OCR'
    }
  ],
  phase3: [
    {
      id: 'docusign',
      name: 'DocuSign',
      category: 'E-Signature',
      contractStatus: 'planned',
      contractStart: '2026-01-01',
      contractEnd: '2026-12-31',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/docusign',
      sandboxConfigured: false,
      productionConfigured: false,
      usageMonitoring: false,
      budgetAlertThreshold: 12000,
      monthlyBudget: 7000,
      fallbackVendor: 'hellosign',
      contingencyPlan: 'HelloSign (Dropbox) for e-signature fallback',
      notes: 'Phase 3 - Electronic signature workflows'
    },
    {
      id: 'bug_bounty',
      name: 'Bug Bounty Platform',
      category: 'Security',
      contractStatus: 'planned',
      contractStart: '2026-02-01',
      contractEnd: '2027-01-31',
      renewalType: 'annual',
      supportTier: 'standard',
      sla: '99.5%',
      apiCredentialsProvisioned: false,
      secretsManagerPath: '/prod/vendors/bug_bounty',
      sandboxConfigured: false,
      productionConfigured: false,
      usageMonitoring: false,
      budgetAlertThreshold: 50000,
      monthlyBudget: 30000,
      fallbackVendor: 'hackerone',
      contingencyPlan: 'HackerOne as primary or Bugcrowd as fallback',
      notes: 'Phase 3 - Bug bounty program (HackerOne or Bugcrowd)'
    }
  ]
};

class Runbook {
  constructor() {
    this.vendors = VENDOR_MATRIX;
    this.auditLog = [];
    this.initializeAuditLog();
  }

  initializeAuditLog() {
    const timestamp = new Date().toISOString();
    this.auditLog.push({
      timestamp,
      action: 'RUNBOOK_INITIALIZED',
      details: 'Vendor matrix loaded with all phases'
    });
  }

  getAllVendors() {
    return [
      ...this.vendors.mvp,
      ...this.vendors.phase2,
      ...this.vendors.phase3
    ];
  }

  getVendorsByPhase(phase) {
    return this.vendors[phase] || [];
  }

  getVendorById(id) {
    return this.getAllVendors().find(v => v.id === id);
  }

  getActiveVendors() {
    return this.getAllVendors().filter(v => v.contractStatus === 'active');
  }

  getVendorsNeedingRenewal(daysAhead = 90) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    return this.getAllVendors().filter(v => {
      if (!v.contractEnd) return false;
      const endDate = new Date(v.contractEnd);
      return endDate > now && endDate <= futureDate;
    }).sort((a, b) => new Date(a.contractEnd) - new Date(b.contractEnd));
  }

  getExpiredVendors() {
    const now = new Date();
    return this.getAllVendors().filter(v => {
      if (!v.contractEnd) return false;
      return new Date(v.contractEnd) < now;
    });
  }

  getVendorsWithoutCredentials() {
    return this.getAllVendors().filter(v => !v.apiCredentialsProvisioned);
  }

  getVendorsWithoutSandbox() {
    return this.getAllVendors().filter(v => !v.sandboxConfigured);
  }

  getVendorsWithoutProduction() {
    return this.getAllVendors().filter(v => !v.productionConfigured);
  }

  getVendorsWithoutMonitoring() {
    return this.getAllVendors().filter(v => !v.usageMonitoring);
  }

  getVendorsWithoutFallback() {
    return this.getAllVendors().filter(v => !v.fallbackVendor);
  }

  generateCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const calendar = [];
    
    // Get all vendor events for this month
    const events = this.getAllVendors().filter(v => {
      if (!v.contractEnd) return false;
      const endDate = new Date(v.contractEnd);
      return endDate.getFullYear() === year && endDate.getMonth() === month - 1;
    });

    // Build calendar grid
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month - 1, day);
      const dayEvents = events.filter(v => {
        const endDate = new Date(v.contractEnd);
        return endDate.getDate() === day;
      });

      calendar.push({
        date: date.toISOString().split('T')[0],
        dayOfWeek: date.getDay(),
        isToday: this.isToday(date),
        events: dayEvents.map(v => ({
          vendorId: v.id,