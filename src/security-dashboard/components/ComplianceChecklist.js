/**
 * ComplianceChecklist.js
 * Interactive ASVS compliance checklist with progress tracking
 * Owner: platform
 * Depends on: 1345, 1357
 * Spec: §10.4
 * Maturity target: foundation
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';

// Design system tokens
const COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#2563eb',
  info: '#6b7280',
  pass: '#16a34a',
  background: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
};

const SPACING = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

const FONT_FAMILY = "'Inter', system-ui, -apple-system, sans-serif";
const MONO_FONT = "'JetBrains Mono', 'Fira Code', monospace";

// ASVS Level definitions
const ASVS_LEVELS = {
  L1: { label: 'Level 1', description: 'Opportunistic' },
  L2: { label: 'Level 2', description: 'Standard' },
  L3: { label: 'Level 3', description: 'Advanced' },
};

// Default checklist items based on OWASP ASVS
const DEFAULT_CHECKLIST_ITEMS = [
  {
    id: 'V1',
    category: 'Architecture, Design and Threat Modeling',
    level: 'L1',
    items: [
      { id: 'V1.1', text: 'Secure software development lifecycle is defined', status: 'pending' },
      { id: 'V1.2', text: 'Threat modeling is performed for all changes', status: 'pending' },
      { id: 'V1.3', text: 'Security requirements are defined for all features', status: 'pending' },
    ],
  },
  {
    id: 'V2',
    category: 'Authentication',
    level: 'L2',
    items: [
      { id: 'V2.1', text: 'Password strength requirements enforced', status: 'pending' },
      { id: 'V2.2', text: 'Multi-factor authentication implemented', status: 'pending' },
      { id: 'V2.3', text: 'Session management is secure', status: 'pending' },
      { id: 'V2.4', text: 'Credential recovery is secure', status: 'pending' },
    ],
  },
  {
    id: 'V3',
    category: 'Session Management',
    level: 'L2',
    items: [
      { id: 'V3.1', text: 'Session tokens are cryptographically random', status: 'pending' },
      { id: 'V3.2', text: 'Session timeout is configured', status: 'pending' },
      { id: 'V3.3', text: 'Session invalidation on logout', status: 'pending' },
    ],
  },
  {
    id: 'V4',
    category: 'Access Control',
    level: 'L2',
    items: [
      { id: 'V4.1', text: 'Least privilege principle enforced', status: 'pending' },
      { id: 'V4.2', text: 'Role-based access control implemented', status: 'pending' },
      { id: 'V4.3', text: 'API authorization is enforced', status: 'pending' },
    ],
  },
  {
    id: 'V5',
    category: 'Validation, Sanitization and Encoding',
    level: 'L2',
    items: [
      { id: 'V5.1', text: 'Input validation is performed', status: 'pending' },
      { id: 'V5.2', text: 'Output encoding is applied', status: 'pending' },
      { id: 'V5.3', text: 'SQL injection prevention in place', status: 'pending' },
      { id: 'V5.4', text: 'XSS prevention implemented', status: 'pending' },
    ],
  },
  {
    id: 'V6',
    category: 'Stored Cryptography',
    level: 'L2',
    items: [
      { id: 'V6.1', text: 'Data at rest encrypted', status: 'pending' },
      { id: 'V6.2', text: 'Keys managed securely', status: 'pending' },
      { id: 'V6.3', text: 'Algorithm selection is appropriate', status: 'pending' },
    ],
  },
  {
    id: 'V7',
    category: 'Error Handling and Logging',
    level: 'L2',
    items: [
      { id: 'V7.1', text: 'Error handling is secure', status: 'pending' },
      { id: 'V7.2', text: 'Security events are logged', status: 'pending' },
      { id: 'V7.3', text: 'Logs are protected from tampering', status: 'pending' },
    ],
  },
  {
    id: 'V8',
    category: 'Data Protection',
    level: 'L2',
    items: [
      { id: 'V8.1', text: 'Sensitive data is classified', status: 'pending' },
      { id: 'V8.2', text: 'Data minimization is practiced', status: 'pending' },
      { id: 'V8.3', text: 'Data retention policies enforced', status: 'pending' },
    ],
  },
  {
    id: 'V9',
    category: 'Communications',
    level: 'L1',
    items: [
      { id: 'V9.1', text: 'TLS is enforced for all communications', status: 'pending' },
      { id: 'V9.2', text: 'Certificate validation is strict', status: 'pending' },
    ],
  },
  {
    id: 'V10',
    category: 'Malicious Code',
    level: 'L2',
    items: [
      { id: 'V10.1', text: 'Code integrity checks in place', status: 'pending' },
      { id: 'V10.2', text: 'Dependency scanning is configured', status: 'pending' },
    ],
  },
  {
    id: 'V11',
    category: 'Business Logic',
    level: 'L2',
    items: [
      { id: 'V11.1', text: 'Business logic is tested for abuse cases', status: 'pending' },
      { id: 'V11.2', text: 'Rate limiting is implemented', status: 'pending' },
    ],
  },
  {
    id: 'V12',
    category: 'Files and Resources',
    level: 'L2',
    items: [
      { id: 'V12.1', text: 'File upload validation is secure', status: 'pending' },
      { id: 'V12.2', text: 'File download restrictions enforced', status: 'pending' },
    ],
  },
  {
    id: 'V13',
    category: 'API and Web Service',
    level: 'L2',
    items: [
      { id: 'V13.1', text: 'API authentication is enforced', status: 'pending' },
      { id: 'V13.2', text: 'API rate limiting is configured', status: 'pending' },
      { id: 'V13.3', text: 'API schema validation is performed', status: 'pending' },
    ],
  },
  {
    id: 'V14',
    category: 'Configuration',
    level: 'L1',
    items: [
      { id: 'V14.1', text: 'Hardening guidelines are followed', status: 'pending' },
      { id: 'V14.2', text: 'Default credentials are changed', status: 'pending' },
      { id: 'V14.3', text: 'Security headers are configured', status: 'pending' },
    ],
  },
];

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    pass: { color: COLORS.pass, label: 'Pass' },
    fail: { color: COLORS.critical, label: 'Fail' },
    warning: { color: COLORS.medium, label: 'Warning' },
    error: { color: COLORS.high, label: 'Error' },
    pending: { color: COLORS.info, label: 'Pending' },
    'not-applicable': { color: COLORS.info, label: 'N/A' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${SPACING.xs} ${SPACING.sm}`,
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        lineHeight: 1,
        color: '#ffffff',
        backgroundColor: config.color,
        fontFamily: FONT_FAMILY,
      }}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['pass', 'fail', 'warning', 'error', 'pending', 'not-applicable']).isRequired,
};

// Progress bar component
const ProgressBar = ({ value, max, label }) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div style={{ width: '100%', marginBottom: SPACING.md }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: SPACING.xs,
          fontFamily: FONT_FAMILY,
          fontSize: '0.875rem',
          color: COLORS.text,
        }}
      >
        <span>{label}</span>
        <span>
          {value}/{max} ({percentage}%)
        </span>
      </div>
      <div
        style={{
          width: '100%',
          height: '0.5rem',
          backgroundColor: COLORS.surface,
          borderRadius: '9999px',
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${percentage}% complete`}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: percentage === 100 ? COLORS.pass : COLORS.low,
            borderRadius: '9999px',
            transition: 'width 0.3s ease-in-out',
          }}
        />
      </div>
    </div>
  );
};

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

// Main ComplianceChecklist component
const ComplianceChecklist = ({
  items = DEFAULT_CHECKLIST_ITEMS,
  onStatusChange,
  readOnly = false,
  targetLevel = 'L2',
  className,
}) => {
  const [checklistItems, setChecklistItems] = useState(items);
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate progress metrics
  const progressMetrics = useMemo(() => {
    const allItems = checklistItems.flatMap((category) => category.items);
    const total = allItems.length;
    const passed = allItems.filter((item) => item.status === 'pass').length;
    const failed = allItems.filter((item) => item.status === 'fail').length;
    const pending = allItems.filter((item) => item.status === 'pending').length;
    const warning = allItems.filter((item) => item.status === 'warning').length;
    const notApplicable = allItems.filter((item) => item.status === 'not-applicable').length;

    return { total, passed, failed, pending, warning, notApplicable };
  }, [checklistItems]);

  // Filter items based on level, status, and search
  const filteredItems = useMemo(() => {
    return checklistItems
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesLevel = filterLevel === 'all' || category.level === filterLevel;
          const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
          const matchesSearch =
            searchQuery === '' ||
            item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.id.toLowerCase().includes(searchQuery.toLowerCase());
          return matchesLevel && matchesStatus && matchesSearch;
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [checklistItems, filterLevel, filterStatus, searchQuery]);

  // Handle status change for an item
  const handleStatusChange = useCallback(
    (categoryId, itemId, newStatus) => {
      if (readOnly) return;

      setChecklistItems((prev) =>
        prev.map((category) => {
          if (category.id !== categoryId) return category;
          return {
            ...category,
            items: category.items.map((item) => {
              if (item.id !== itemId) return item;
              return { ...item, status: newStatus };
            }),
          };
        })
      );

      if (onStatusChange) {
        onStatusChange(categoryId, itemId, newStatus);
      }
    },
    [readOnly, onStatusChange]
  );

  // Calculate category progress
  const getCategoryProgress = useCallback((category) => {
    const total = category.items.length;
    const passed = category.items.filter((item) => item.status === 'pass').length;
    return { total, passed };
  }, []);

  // Get overall compliance level
  const complianceLevel = useMemo(() => {
    const { total, passed } = progressMetrics;
    if (total === 0) return { level: 'N/A', percentage: 0 };
    const percentage = Math.round((passed / total) * 100);
    if (percentage >= 90) return { level: 'Excellent', percentage };
    if (percentage >= 70) return { level: 'Good', percentage };
    if (percentage >= 50) return { level: 'Fair', percentage };
    return { level: 'Needs Improvement', percentage };
  }, [progressMetrics]);

  // Get level-specific compliance
  const levelCompliance = useMemo(() => {
    const levels = ['L1', 'L2', 'L3'];
    return levels.map((level) => {
      const levelItems = checklistItems
        .filter((cat) => cat.level === level)
        .flatMap((cat) => cat.items);
      const total = levelItems.length;
      const passed = levelItems.filter((item) => item.status === 'pass').length;
      return {
        level,
        label: ASVS_LEVELS[level]?.label || level,
        total,
        passed,
        percentage: total > 0 ? Math.round((passed / total) * 100) : 0,
      };
    });
  }, [checklistItems]);

  // Check if target level is met
  const targetLevelMet = useMemo(() => {
    const targetData = levelCompliance.find((l) => l.level === targetLevel);
    return targetData ? targetData.percentage >= 80 : false;
  }, [levelCompliance, targetLevel]);

  return (
    <div
      className={className}
      style={{
        backgroundColor: COLORS.background,
        color: COLORS.text,
        fontFamily: FONT_FAMILY,
        padding: SPACING.lg,
        borderRadius: '0.5rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: SPACING.xl,
          borderBottom: `1px solid ${COLORS.surface}`,
          paddingBottom: SPACING.lg,
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            margin: `0 0 ${SPACING.sm} 0`,
            color: COLORS.text,
          }}
        >
          ASVS Compliance Checklist
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            color: COLORS.info,
            margin: 0,
          }}
        >
          OWASP Application Security Verification Standard - Target: {ASVS_LEVELS[targetLevel]?.label || targetLevel}
        </p>
      </div>

      {/* Overall Progress */}
      <div
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: '0.5rem',
          padding: SPACING.lg,
          marginBottom: SPACING.lg,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: SPACING.md,
            marginBottom: SPACING.lg,
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: COLORS.info, marginBottom: SPACING.xs }}>
              Overall Compliance
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                color:
                  complianceLevel.percentage >= 90
                    ? COLORS.pass
                    : complianceLevel.percentage >= 70
                    ? COLORS.medium
                    : COLORS.high,
              }}
            >
              {complianceLevel.percentage}%
            </div>
            <div style={{ fontSize: '0.875rem', color: COLORS.info }}>
              {complianceLevel.level}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: COLORS.info, marginBottom: SPACING.xs }}>
              Target Level Status
            </div>
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: targetLevelMet ? COLORS.pass : COLORS.high,
              }}
            >
              {targetLevelMet ? '✓ Met' : '✗ Not Met'}
            </div>
            <div