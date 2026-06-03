// src/security-dashboard/components/StatusBadge.js
// owner: platform
// depends_on: [1345, 1357]
// spec_sections: [§10.4]
// maturity_target: foundation

const STATUS_CONFIG = Object.freeze({
  pass: {
    label: 'Pass',
    color: '#16a34a',
    icon: '✓',
    severity: 'success',
    description: 'All checks passed'
  },
  fail: {
    label: 'Fail',
    color: '#dc2626',
    icon: '✗',
    severity: 'critical',
    description: 'One or more checks failed'
  },
  warning: {
    label: 'Warning',
    color: '#ca8a04',
    icon: '⚠',
    severity: 'medium',
    description: 'Non-critical issues detected'
  },
  error: {
    label: 'Error',
    color: '#ea580c',
    icon: '!',
    severity: 'high',
    description: 'System error occurred'
  }
});

const VALID_STATUSES = Object.keys(STATUS_CONFIG);

class StatusBadge extends HTMLElement {
  static get observedAttributes() {
    return ['status', 'size', 'pulse', 'label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._status = 'pass';
    this._size = 'md';
    this._pulse = false;
    this._customLabel = null;
    this._boundAnimationEnd = this._handleAnimationEnd.bind(this);
  }

  connectedCallback() {
    this._upgradeProperty('status');
    this._upgradeProperty('size');
    this._upgradeProperty('pulse');
    this._upgradeProperty('label');
    this._render();
    this.addEventListener('animationend', this._boundAnimationEnd);
  }

  disconnectedCallback() {
    this.removeEventListener('animationend', this._boundAnimationEnd);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'status':
        this._status = this._validateStatus(newValue);
        break;
      case 'size':
        this._size = this._validateSize(newValue);
        break;
      case 'pulse':
        this._pulse = newValue !== null && newValue !== 'false';
        break;
      case 'label':
        this._customLabel = newValue;
        break;
    }

    if (this.shadowRoot && this.shadowRoot.children.length > 0) {
      this._render();
    }
  }

  get status() {
    return this._status;
  }

  set status(value) {
    const validated = this._validateStatus(value);
    if (validated !== this._status) {
      this._status = validated;
      this.setAttribute('status', validated);
    }
  }

  get size() {
    return this._size;
  }

  set size(value) {
    const validated = this._validateSize(value);
    if (validated !== this._size) {
      this._size = validated;
      this.setAttribute('size', validated);
    }
  }

  get pulse() {
    return this._pulse;
  }

  set pulse(value) {
    const boolValue = Boolean(value);
    if (boolValue !== this._pulse) {
      this._pulse = boolValue;
      if (boolValue) {
        this.setAttribute('pulse', '');
      } else {
        this.removeAttribute('pulse');
      }
    }
  }

  get label() {
    return this._customLabel;
  }

  set label(value) {
    this._customLabel = value;
    if (value) {
      this.setAttribute('label', value);
    } else {
      this.removeAttribute('label');
    }
  }

  _upgradeProperty(prop) {
    if (this.hasOwnProperty(prop)) {
      const value = this[prop];
      delete this[prop];
      this[prop] = value;
    }
  }

  _validateStatus(value) {
    if (VALID_STATUSES.includes(value)) {
      return value;
    }
    console.warn(`Invalid status "${value}". Using "pass" as default. Valid options: ${VALID_STATUSES.join(', ')}`);
    return 'pass';
  }

  _validateSize(value) {
    const validSizes = ['sm', 'md', 'lg'];
    if (validSizes.includes(value)) {
      return value;
    }
    console.warn(`Invalid size "${value}". Using "md" as default. Valid options: ${validSizes.join(', ')}`);
    return 'md';
  }

  _handleAnimationEnd() {
    if (this._pulse) {
      this.shadowRoot.querySelector('.badge').classList.remove('pulse');
      // Force reflow to restart animation
      void this.shadowRoot.querySelector('.badge').offsetWidth;
      this.shadowRoot.querySelector('.badge').classList.add('pulse');
    }
  }

  _getStyles() {
    const config = STATUS_CONFIG[this._status];
    const sizeMap = {
      sm: { padding: '2px 6px', fontSize: '11px', iconSize: '12px', borderRadius: '3px' },
      md: { padding: '4px 10px', fontSize: '13px', iconSize: '14px', borderRadius: '4px' },
      lg: { padding: '6px 14px', fontSize: '15px', iconSize: '16px', borderRadius: '6px' }
    };
    const size = sizeMap[this._size];

    return `
      :host {
        display: inline-flex;
        align-items: center;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: ${size.padding};
        font-size: ${size.fontSize};
        font-weight: 600;
        line-height: 1.2;
        border-radius: ${size.borderRadius};
        background-color: ${config.color}1A;
        color: ${config.color};
        border: 1px solid ${config.color}33;
        user-select: none;
        white-space: nowrap;
        transition: background-color 0.2s ease, box-shadow 0.2s ease;
      }

      .badge:hover {
        background-color: ${config.color}26;
      }

      .badge:focus-visible {
        outline: 2px solid ${config.color};
        outline-offset: 2px;
      }

      .badge.pulse {
        animation: pulse 2s infinite;
      }

      .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: ${size.iconSize};
        height: ${size.iconSize};
        font-size: ${size.iconSize};
        font-weight: 700;
        flex-shrink: 0;
      }

      .label {
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
      }

      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
      }

      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 0 0 0 ${config.color}40;
        }
        50% {
          box-shadow: 0 0 0 6px ${config.color}00;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .badge.pulse {
          animation: none;
        }
        .badge {
          transition: none;
        }
      }

      @media (prefers-color-scheme: dark) {
        .badge {
          background-color: ${config.color}14;
          border-color: ${config.color}26;
        }
        .badge:hover {
          background-color: ${config.color}1F;
        }
      }
    `;
  }

  _render() {
    const config = STATUS_CONFIG[this._status];
    const displayLabel = this._customLabel || config.label;
    const pulseClass = this._pulse ? 'pulse' : '';
    const role = this._status === 'error' || this._status === 'fail' ? 'alert' : 'status';

    this.shadowRoot.innerHTML = `
      <style>${this._getStyles()}</style>
      <span class="badge ${pulseClass}" role="${role}" aria-live="polite" tabindex="0">
        <span class="icon" aria-hidden="true">${config.icon}</span>
        <span class="label">${this._escapeHTML(displayLabel)}</span>
        <span class="sr-only">${this._escapeHTML(config.description)}</span>
      </span>
    `;
  }

  _escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

if (!customElements.get('status-badge')) {
  customElements.define('status-badge', StatusBadge);
}

export { StatusBadge, STATUS_CONFIG, VALID_STATUSES };
export default StatusBadge;