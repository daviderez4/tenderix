// js/utils.js
// Utility Functions for Tenderix

const Utils = {
  // ============================================
  // FORMATTING
  // ============================================

  /**
   * Format currency (ILS)
   */
  formatCurrency(value, options = {}) {
    if (value === null || value === undefined) return '₪0';

    const { compact = false, decimals = 0 } = options;

    if (compact && value >= 1000000) {
      return '₪' + (value / 1000000).toFixed(1) + 'M';
    }

    if (compact && value >= 1000) {
      return '₪' + (value / 1000).toFixed(0) + 'K';
    }

    return '₪' + value.toLocaleString(CONFIG.APP.CURRENCY_LOCALE, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  },

  /**
   * Format date in Hebrew
   */
  formatDate(dateStr, options = {}) {
    if (!dateStr) return '';

    const { format = 'short', includeTime = false } = options;

    const date = new Date(dateStr);

    const dateOptions = {
      day: '2-digit',
      month: format === 'long' ? 'long' : '2-digit',
      year: 'numeric'
    };

    if (includeTime) {
      dateOptions.hour = '2-digit';
      dateOptions.minute = '2-digit';
    }

    return date.toLocaleDateString('he-IL', dateOptions);
  },

  /**
   * Format relative time (e.g., "לפני 2 שעות")
   */
  formatRelativeTime(dateStr) {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(diff / 604800000);

    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דקות`;
    if (hours < 24) return `לפני ${hours} שעות`;
    if (days < 7) return `לפני ${days} ימים`;
    if (weeks < 4) return `לפני ${weeks} שבועות`;

    return this.formatDate(dateStr);
  },

  /**
   * Get days remaining until deadline
   */
  getDaysRemaining(deadline) {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    return days;
  },

  /**
   * Format days remaining as text
   */
  formatDaysRemaining(deadline) {
    const days = this.getDaysRemaining(deadline);

    if (days === null) return '';
    if (days < 0) return 'פג תוקף';
    if (days === 0) return 'היום!';
    if (days === 1) return 'מחר';
    if (days <= 7) return `${days} ימים`;
    if (days <= 30) return `${Math.ceil(days / 7)} שבועות`;

    return `${Math.ceil(days / 30)} חודשים`;
  },

  /**
   * Check if deadline is urgent
   */
  isUrgent(deadline, thresholdDays = 3) {
    const days = this.getDaysRemaining(deadline);
    return days !== null && days <= thresholdDays;
  },

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  /**
   * Format percentage
   */
  formatPercent(value, decimals = 0) {
    if (value === null || value === undefined) return '0%';
    return value.toFixed(decimals) + '%';
  },

  /**
   * Format number with Hebrew locale
   */
  formatNumber(value) {
    if (value === null || value === undefined) return '0';
    return value.toLocaleString('he-IL');
  },

  // ============================================
  // SCORE HELPERS
  // ============================================

  /**
   * Get score level (high, medium, low)
   */
  getScoreLevel(score) {
    if (score >= CONFIG.SCORES.HIGH) return 'high';
    if (score >= CONFIG.SCORES.MEDIUM) return 'medium';
    return 'low';
  },

  /**
   * Get score color
   */
  getScoreColor(score) {
    const level = this.getScoreLevel(score);
    return CONFIG.SCORE_COLORS[level];
  },

  /**
   * Get score class for CSS
   */
  getScoreClass(score) {
    return 'score-' + this.getScoreLevel(score);
  },

  // ============================================
  // STATUS HELPERS
  // ============================================

  /**
   * Get status label in Hebrew
   */
  getStatusLabel(status) {
    return CONFIG.STATUS_LABELS[status] || status;
  },

  /**
   * Get gate status label
   */
  getGateLabel(status) {
    return CONFIG.GATE_LABELS[status] || status;
  },

  /**
   * Get status color class
   */
  getStatusClass(status) {
    const classes = {
      'active': 'status-active',
      'analyzing': 'status-analyzing',
      'pending_decision': 'status-pending',
      'submitted': 'status-submitted',
      'won': 'status-won',
      'lost': 'status-lost',
      'cancelled': 'status-cancelled',
      'expired': 'status-expired'
    };

    return classes[status] || 'status-default';
  },

  // ============================================
  // TOAST NOTIFICATIONS
  // ============================================

  /**
   * Show toast notification
   */
  showToast(type, title, description = '') {
    // Get or create toast container
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-up`;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || 'ℹ'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${description ? `<div class="toast-desc">${description}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    // Add to container
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, CONFIG.NOTIFICATIONS.AUTO_DISMISS_MS);

    // Limit visible toasts
    const toasts = container.querySelectorAll('.toast');
    if (toasts.length > CONFIG.NOTIFICATIONS.MAX_VISIBLE) {
      toasts[0].remove();
    }

    return toast;
  },

  // ============================================
  // LOADING STATES
  // ============================================

  /**
   * Show/hide loading overlay
   */
  showLoading(show, message = 'טוען...') {
    let overlay = document.getElementById('loading-overlay');

    if (show) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
          <div class="loading-content">
            <div class="ai-loader">
              <div class="ai-loader-ring"></div>
              <div class="ai-loader-ring"></div>
              <div class="ai-loader-ring"></div>
            </div>
            <div class="loading-message">${message}</div>
          </div>
        `;
        document.body.appendChild(overlay);
      } else {
        overlay.querySelector('.loading-message').textContent = message;
        overlay.style.display = 'flex';
      }
    } else if (overlay) {
      overlay.style.display = 'none';
    }
  },

  /**
   * Show skeleton loading in element
   */
  showSkeleton(element, rows = 3) {
    if (!element) return;

    const skeletons = Array(rows).fill(0).map(() => `
      <div class="skeleton-item">
        <div class="skeleton skeleton-line" style="width: ${60 + Math.random() * 40}%"></div>
      </div>
    `).join('');

    element.innerHTML = `<div class="skeleton-container">${skeletons}</div>`;
  },

  // ============================================
  // DOM HELPERS
  // ============================================

  /**
   * Query selector with error handling
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query selector all
   */
  $$(selector, parent = document) {
    return [...parent.querySelectorAll(selector)];
  },

  /**
   * Create element with attributes
   */
  createElement(tag, attrs = {}, children = []) {
    const el = document.createElement(tag);

    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value);
      } else if (key.startsWith('on')) {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        el.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child) {
        el.appendChild(child);
      }
    });

    return el;
  },

  /**
   * Debounce function
   */
  debounce(fn, delay = 300) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  /**
   * Throttle function
   */
  throttle(fn, limit = 100) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // ============================================
  // URL HELPERS
  // ============================================

  /**
   * Get URL parameter
   */
  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  },

  /**
   * Update URL parameters
   */
  updateUrlParams(params) {
    const url = new URL(window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        url.searchParams.delete(key);
      } else {
        url.searchParams.set(key, value);
      }
    });
    window.history.replaceState({}, '', url);
  },

  /**
   * Navigate to page
   */
  navigate(path, params = {}) {
    const url = new URL(path, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    window.location.href = url.toString();
  },

  // ============================================
  // STORAGE HELPERS
  // ============================================

  /**
   * Save to local storage
   */
  saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.warn('Failed to save to storage:', error);
      return false;
    }
  },

  /**
   * Load from local storage
   */
  loadFromStorage(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.warn('Failed to load from storage:', error);
      return defaultValue;
    }
  },

  /**
   * Remove from local storage
   */
  removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Failed to remove from storage:', error);
      return false;
    }
  },

  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Validate email
   */
  isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  /**
   * Validate Israeli phone
   */
  isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^0[2-9]\d{7,8}$/.test(cleaned);
  },

  /**
   * Validate Israeli business ID (ח.פ.)
   */
  isValidBusinessId(id) {
    const cleaned = id.replace(/\D/g, '');
    return cleaned.length === 9;
  },

  // ============================================
  // MISC HELPERS
  // ============================================

  /**
   * Generate unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  /**
   * Deep clone object
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * Check if object is empty
   */
  isEmpty(obj) {
    if (!obj) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  },

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  /**
   * Truncate text
   */
  truncate(str, length = 100, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.slice(0, length).trim() + suffix;
  },

  /**
   * Sleep/delay
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Copy to clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('success', 'הועתק!', '');
      return true;
    } catch (error) {
      console.warn('Failed to copy:', error);
      this.showToast('error', 'שגיאה בהעתקה', '');
      return false;
    }
  },

  /**
   * Scroll to element
   */
  scrollTo(element, options = {}) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        ...options
      });
    }
  }
};

// Export globally
window.Utils = Utils;

console.log('Tenderix Utils loaded');
