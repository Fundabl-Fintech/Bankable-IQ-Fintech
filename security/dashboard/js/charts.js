/**
 * security/dashboard/js/charts.js
 * Chart.js configuration for vulnerability trends, scan history, and CVE severity distribution
 * 
 * @owner platform
 * @depends_on [1345, 1357]
 * @spec_sections [§10.4]
 * @maturity_target foundation
 */

import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

// Color palette from design system
const COLORS = {
  primary: '#1a73e8',
  success: '#0f9d58',
  warning: '#f4b400',
  danger: '#ea4335',
  neutral: '#5f6368',
  background: '#ffffff',
  surface: '#f8f9fa'
};

const FONTS = {
  heading: "'Inter', sans-serif",
  body: "'Roboto', sans-serif",
  monospace: "'JetBrains Mono', monospace"
};

// Chart.js global defaults
Chart.defaults.font.family = FONTS.body;
Chart.defaults.color = COLORS.neutral;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

/**
 * Creates a vulnerability trends line chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array<{date: string, critical: number, high: number, medium: number, low: number}>} data
 * @returns {Chart} Chart instance
 */
export function createVulnerabilityTrendsChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) throw new Error(`Canvas element #${canvasId} not found`);

  const labels = data.map(d => new Date(d.date));
  
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Critical',
          data: data.map(d => d.critical),
          borderColor: COLORS.danger,
          backgroundColor: `${COLORS.danger}20`,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'High',
          data: data.map(d => d.high),
          borderColor: COLORS.warning,
          backgroundColor: `${COLORS.warning}20`,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Medium',
          data: data.map(d => d.medium),
          borderColor: COLORS.primary,
          backgroundColor: `${COLORS.primary}20`,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Low',
          data: data.map(d => d.low),
          borderColor: COLORS.success,
          backgroundColor: `${COLORS.success}20`,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: FONTS.body,
              size: 12
            },
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: COLORS.background,
          titleFont: { family: FONTS.heading, size: 14 },
          bodyFont: { family: FONTS.body, size: 13 },
          borderColor: COLORS.neutral,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const date = items[0].parsed.x;
              return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'MMM dd, yyyy',
            displayFormats: {
              day: 'MMM dd'
            }
          },
          grid: {
            display: false
          },
          ticks: {
            font: { family: FONTS.body, size: 11 },
            maxRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Vulnerability Count',
            font: { family: FONTS.body, size: 12 }
          },
          grid: {
            color: `${COLORS.neutral}20`
          },
          ticks: {
            font: { family: FONTS.body, size: 11 },
            stepSize: 1
          }
        }
      }
    }
  });
}

/**
 * Creates a scan history bar chart
 * @param {string} canvasId - Canvas element ID
 * @param {Array<{date: string, total: number, passed: number, failed: number, errors: number}>} data
 * @returns {Chart} Chart instance
 */
export function createScanHistoryChart(canvasId, data) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) throw new Error(`Canvas element #${canvasId} not found`);

  const labels = data.map(d => new Date(d.date));

  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Passed',
          data: data.map(d => d.passed),
          backgroundColor: COLORS.success,
          borderColor: COLORS.success,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Failed',
          data: data.map(d => d.failed),
          backgroundColor: COLORS.danger,
          borderColor: COLORS.danger,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Errors',
          data: data.map(d => d.errors),
          backgroundColor: COLORS.warning,
          borderColor: COLORS.warning,
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: FONTS.body, size: 12 },
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: COLORS.background,
          titleFont: { family: FONTS.heading, size: 14 },
          bodyFont: { family: FONTS.body, size: 13 },
          borderColor: COLORS.neutral,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            title: (items) => {
              if (!items.length) return '';
              const date = items[0].parsed.x;
              return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            },
            footer: (items) => {
              const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total: ${total}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            tooltipFormat: 'MMM dd, yyyy',
            displayFormats: {
              day: 'MMM dd'
            }
          },
          stacked: true,
          grid: { display: false },
          ticks: {
            font: { family: FONTS.body, size: 11 },
            maxRotation: 45
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Scan Results',
            font: { family: FONTS.body, size: 12 }
          },
          grid: {
            color: `${COLORS.neutral}20`
          },
          ticks: {
            font: { family: FONTS.body, size: 11 },
            stepSize: 1
          }
        }
      }
    }
  });
}

/**
 * Creates a CVE severity distribution doughnut chart
 * @param {string} canvasId - Canvas element ID
 * @param {Object} severityData - { critical: number, high: number, medium: number, low: number, none: number }
 * @returns {Chart} Chart instance
 */
export function createCVESeverityChart(canvasId, severityData) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) throw new Error(`Canvas element #${canvasId} not found`);

  const labels = ['Critical', 'High', 'Medium', 'Low', 'None'];
  const data = [
    severityData.critical || 0,
    severityData.high || 0,
    severityData.medium || 0,
    severityData.low || 0,
    severityData.none || 0
  ];
  const backgroundColors = [
    COLORS.danger,
    COLORS.warning,
    COLORS.primary,
    COLORS.success,
    COLORS.neutral
  ];

  const total = data.reduce((sum, val) => sum + val, 0);

  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: COLORS.background,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: FONTS.body, size: 12 },
            usePointStyle: true,
            padding: 16,
            generateLabels: (chart) => {
              const datasets = chart.data.datasets;
              return chart.data.labels.map((label, i) => ({
                text: `${label}: ${datasets[0].data[i]}`,
                fillStyle: datasets[0].backgroundColor[i],
                strokeStyle: datasets[0].borderColor,
                lineWidth: datasets[0].borderWidth,
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: COLORS.background,
          titleFont: { family: FONTS.heading, size: 14 },
          bodyFont: { family: FONTS.body, size: 13 },
          borderColor: COLORS.neutral,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'centerText',
      beforeDraw: (chart) => {
        const { width, height, ctx } = chart;
        ctx.save();
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Draw total count
        ctx.font = `bold 24px ${FONTS.heading}`;
        ctx.fillStyle = COLORS.neutral;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, centerX, centerY - 10);
        
        // Draw label
        ctx.font = `12px ${FONTS.body}`;
        ctx.fillStyle = COLORS.neutral;
        ctx.fillText('Total CVEs', centerX, centerY + 16);
        
        ctx.restore();
      }
    }]
  });
}

/**
 * Creates a combined security dashboard with all three charts
 * @param {Object} config - Configuration object with canvas IDs and data
 * @param {string} config.trendsCanvasId - Canvas ID for vulnerability trends
 * @param {string} config.scanHistoryCanvasId - Canvas ID for scan history
 * @param {string} config.severityCanvasId - Canvas ID for CVE severity
 * @param {Object} config.trendsData - Data for vulnerability trends chart
 * @param {Object} config.scanHistoryData - Data for scan history chart
 * @param {Object} config.severityData - Data for CVE severity chart
 * @returns {Object} Object containing all three chart instances
 */
export function initializeSecurityDashboard(config) {
  const {
    trendsCanvasId,
    scanHistoryCanvasId,
    severityCanvasId,
    trendsData,
    scanHistoryData,
    severityData
  } = config;

  // Validate inputs
  if (!trendsCanvasId || !scanHistoryCanvasId || !severityCanvasId) {
    throw new Error('All canvas IDs must be provided');
  }

  const charts = {};

  try {
    charts.trends = createVulnerabilityTrendsChart(trendsCanvasId, trendsData);
  } catch (error) {
    console.error('Failed to create vulnerability trends chart:', error);
    charts.trends = null;
  }

  try {
    charts.scanHistory = createScanHistoryChart(scanHistoryCanvasId, scanHistoryData);
  } catch (error) {
    console.error('Failed to create scan history chart:', error);
    charts.scanHistory = null;
  }

  try {
    charts.severity = createCVESeverityChart(severityCanvasId, severityData);
  } catch (error) {
    console.error('Failed to create CVE severity chart:', error);
    charts.severity = null;
  }

  // Return cleanup function
  charts.destroy = () => {
    Object.values(charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
  };

  return charts;
}

export default {
  createVulnerabilityTrendsChart,
  createScanHistoryChart,
  createCVESeverityChart,
  initializeSecurityDashboard
};