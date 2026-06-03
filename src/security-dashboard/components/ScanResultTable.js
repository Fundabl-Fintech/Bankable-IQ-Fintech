// src/security-dashboard/components/ScanResultTable.js
// owner: platform, depends_on: [1345, 1357], spec_sections: [§10.4]

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

// ---------------------------------------------------------------------------
// Design System Tokens (from Security Dashboard Design System v1.0.0)
// ---------------------------------------------------------------------------
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

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

// ---------------------------------------------------------------------------
// Helper: SeverityIndicator (inline component for accessibility + color coding)
// ---------------------------------------------------------------------------
function SeverityIndicator({ severity, label }) {
  const color = COLORS[severity] || COLORS.info;
  return (
    <span
      className="severity-indicator"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        color,
        fontWeight: 600,
        fontSize: '0.8125rem',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
      role="status"
      aria-label={`Severity: ${severity}`}
    >
      <span
        aria-hidden="true"
        style={{
          width: '0.625rem',
          height: '0.625rem',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      {label || severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

SeverityIndicator.propTypes = {
  severity: PropTypes.oneOf(['critical', 'high', 'medium', 'low', 'info']).isRequired,
  label: PropTypes.string,
};

// ---------------------------------------------------------------------------
// Helper: StatusBadge (pass/fail/warning/error)
// ---------------------------------------------------------------------------
function StatusBadge({ status }) {
  const colorMap = {
    pass: COLORS.pass,
    fail: COLORS.critical,
    warning: COLORS.medium,
    error: COLORS.high,
  };
  const bgMap = {
    pass: '#14532d',
    fail: '#7f1d1d',
    warning: '#713f12',
    error: '#7c2d12',
  };
  const color = colorMap[status] || COLORS.info;
  const bg = bgMap[status] || '#374151';

  return (
    <span
      className="status-badge"
      style={{
        display: 'inline-block',
        padding: '0.125rem 0.5rem',
        borderRadius: '9999px',
        backgroundColor: bg,
        color,
        fontWeight: 600,
        fontSize: '0.75rem',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
      }}
      role="status"
      aria-label={`Status: ${status}`}
    >
      {status}
    </span>
  );
}

StatusBadge.propTypes = {
  status: PropTypes.oneOf(['pass', 'fail', 'warning', 'error']).isRequired,
};

// ---------------------------------------------------------------------------
// Helper: format timestamp for display
// ---------------------------------------------------------------------------
function formatTimestamp(ts) {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ts);
  }
}

// ---------------------------------------------------------------------------
// Default column definitions
// ---------------------------------------------------------------------------
const DEFAULT_COLUMNS = [
  { key: 'severity', label: 'Severity', sortable: true, filterable: true },
  { key: 'status', label: 'Status', sortable: true, filterable: true },
  { key: 'scanner', label: 'Scanner', sortable: true, filterable: true },
  { key: 'rule', label: 'Rule / ID', sortable: true, filterable: true },
  { key: 'path', label: 'Path', sortable: true, filterable: true },
  { key: 'description', label: 'Description', sortable: false, filterable: true },
  { key: 'timestamp', label: 'Found At', sortable: true, filterable: false },
];

// ---------------------------------------------------------------------------
// Main ScanResultTable Component
// ---------------------------------------------------------------------------

/**
 * ScanResultTable — Sortable, filterable table for displaying scan results.
 *
 * Implements:
 *  - Color-coded severity (critical=red, high=orange, medium=yellow, low=blue)
 *  - Mobile-first responsive layout
 *  - WCAG 2.1 AA: proper roles, aria-labels, keyboard navigation
 *  - Sort by any sortable column (click header to toggle asc/desc)
 *  - Filter by text across filterable columns
 *  - Severity badge + status badge rendering
 *
 * @param {Object} props
 * @param {Array}  props.data          - Array of scan result objects
 * @param {Array}  [props.columns]     - Column definitions (defaults to DEFAULT_COLUMNS)
 * @param {string} [props.ariaLabel]   - Accessible label for the table
 * @param {string} [props.className]   - Additional CSS class for wrapper
 * @param {number} [props.pageSize]    - Number of rows per page (default 25)
 */
export default function ScanResultTable({
  data = [],
  columns: customColumns,
  ariaLabel = 'Scan results table',
  className = '',
  pageSize = 25,
}) {
  // ----- state -----
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const filterInputRef = useRef(null);

  // Reset page when data or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, filterText]);

  // ----- columns (merge custom with defaults) -----
  const columns = useMemo(() => {
    if (customColumns && customColumns.length > 0) return customColumns;
    return DEFAULT_COLUMNS;
  }, [customColumns]);

  // ----- filtering -----
  const filteredData = useMemo(() => {
    if (!filterText.trim()) return data;
    const lower = filterText.toLowerCase().trim();
    return data.filter((row) =>
      columns.some((col) => {
        if (!col.filterable) return false;
        const val = row[col.key];
        return val != null && String(val).toLowerCase().includes(lower);
      })
    );
  }, [data, filterText, columns]);

  // ----- sorting -----
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col || !col.sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      // Handle severity ordering
      if (sortKey === 'severity') {
        aVal = SEVERITY_ORDER.indexOf(aVal);
        bVal = SEVERITY_ORDER.indexOf(bVal);
        if (aVal === -1) aVal = 99;
        if (bVal === -1) bVal = 99;
      } else {
        // Coerce to string for comparison
        aVal = aVal == null ? '' : String(aVal);
        bVal = bVal == null ? '' : String(bVal);
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDir, columns]);

  // ----- pagination -----
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // ----- sort handler -----
  const handleSort = useCallback(
    (key) => {
      setSortKey((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
          return key;
        }
        setSortDir('asc');
        return key;
      });
    },
    []
  );

  // ----- keyboard handler for sort headers -----
  const handleHeaderKeyDown = useCallback(
    (e, key) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSort(key);
      }
    },
    [handleSort]
  );

  // ----- render helpers -----
  const renderCell = useCallback((row, col) => {
    const value = row[col.key];
    if (col.key === 'severity') {
      return <SeverityIndicator severity={value} />;
    }
    if (col.key === 'status') {
      return <StatusBadge status={value} />;
    }
    if (col.key === 'timestamp') {
      return (
        <span style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '0.75rem' }}>
          {formatTimestamp(value)}
        </span>
      );
    }
    // Default: render as string, truncate long descriptions
    const str = value == null ? '—' : String(value);
    if (col.key === 'description' && str.length > 120) {
      return (
        <span title={str}>
          {str.slice(0, 120)}…
        </span>
      );
    }
    return <span>{str}</span>;
  }, []);

  // ----- empty state -----
  if (!data || data.length === 0) {
    return (
      <div
        className={`scan-result-table-empty ${className}`}
        style={{
          padding: '2rem',
          textAlign: 'center',
          color: COLORS.info,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          backgroundColor: COLORS.surface,
          borderRadius: '0.5rem',
          border: `1px solid #334155`,
        }}
        role="status"
        aria-label="No scan results available"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ margin: '0 auto 1rem', opacity: 0.5 }}
          aria-hidden="true"
        >
          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p style={{ margin: 0, fontSize: '0.875rem' }}>No scan results to display.</p>
      </div>
    );
  }

  return (
    <div
      className={`scan-result-table-wrapper ${className}`}
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: '0.5rem',
        border: `1px solid #334155`,
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: COLORS.text,
      }}
    >
      {/* ---- Filter Bar ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          borderBottom: `1px solid #334155`,
          flexWrap: 'wrap',
        }}
      >
        <label htmlFor="scan-filter-input" style={{ fontSize: '0.8125rem', fontWeight: 500, color: COLORS.info }}>
          Filter
        </label>
        <input
          id="scan-filter-input"
          ref={filterInputRef}
          type="search"
          placeholder="Search across all columns…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          aria-label="Filter scan results"
          style={{
            flex: '1 1 200px',
            minWidth: '160px',
            padding: '0.375rem 0.75rem',
            borderRadius: '0.375rem',
            border: `1px solid #475569`,
            backgroundColor: COLORS.background,
            color: COLORS.text,
            fontSize: '0.8125rem',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setFilterText('');
              filterInputRef.current?.blur();
            }
          }}
        />
        <span
          style={{
            fontSize: '0.75rem',
            color: COLORS.info,
            whiteSpace: 'nowrap',
          }}
          aria-live="polite"
        >
          {filteredData.length} of {data.length} results
        </span>
      </div>

      {/* ---- Table (responsive wrapper) ---- */}
      <div style={{ overflowX: 'auto' }}>
        <table
          role="table"
          aria-label={ariaLabel}
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
            minWidth: '640px',
          }}
        >
          {/* ---- Header ---- */}
          <thead>
            <tr style={{ borderBottom: `2px solid #334155`, backgroundColor: '#0f172a' }}>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const canSort = col.sortable;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    role={canSort ? 'columnheader button' : 'columnheader'}
                    tabIndex={canSort ? 0 : undefined}
                    aria-sort={
                      isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                    }
                    onClick={canSort ? () => handleSort(col.key) : undefined}
                    onKeyDown={canSort ? (e) => handleHeaderKeyDown(e, col.key) : undefined}
                    style={{
                      padding: '0.625rem 0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: COLORS.info,
                      cursor: canSort ? 'pointer' : 'default',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      position: 'relative',
                    }}
                  >
                    {col.label}
                    {canSort && (
                      <span
                        aria-hidden="true"
                        style={{
                          marginLeft: '0.375rem',
                          opacity: isSorted ? 1 : 0.3,
                          display: 'inline-block',
                          transition: 'opacity 0.15s',
                        }}
                      >
                        {isSorted && sortDir === 'asc' ? '▲' : isSorted && sortDir === 'desc' ? '▼' : '⇅'}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ---- Body ---- */}
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: COLORS.info,
                    fontStyle: 'italic',
                  }}
                >
                  No results match the current filter.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || row.rule + row.path + idx}
                  style={{
                    borderBottom: `1px solid #1e293b`,
                    backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '0.5rem 0.75rem',
                        verticalAlign: 'top',
                        maxWidth: col.key === 'description' ? '300px' : '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {renderCell(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---- Pagination ---- */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            borderTop: `1px solid #334155`,
            fontSize: '0.8125rem