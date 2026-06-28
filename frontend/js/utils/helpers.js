/**
 * helpers.js
 * Pure utility functions — no DOM, no API calls.
 * Safe to import anywhere.
 */

// -----------------------------------------------------------
// Date & Time Formatting
// -----------------------------------------------------------

/**
 * Format an ISO date string to a human-readable date.
 * e.g. "2024-06-15T10:30:00.000Z" → "Jun 15, 2024"
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return '—';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format an ISO date string to date + time.
 * e.g. "Jun 15, 2024, 10:30 AM"
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '—';
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

/**
 * Relative time ago string.
 * e.g. "2 hours ago", "just now", "3 days ago"
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function timeAgo(dateInput) {
  if (!dateInput) return '—';
  const now      = Date.now();
  const then     = new Date(dateInput).getTime();
  const diffSecs = Math.floor((now - then) / 1000);

  if (diffSecs < 60)        return 'just now';
  if (diffSecs < 3600)      return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400)     return `${Math.floor(diffSecs / 3600)}h ago`;
  if (diffSecs < 2592000)   return `${Math.floor(diffSecs / 86400)}d ago`;
  return formatDate(dateInput);
}

// -----------------------------------------------------------
// Currency Formatting
// -----------------------------------------------------------

/**
 * Format a number as Indian Rupees.
 * e.g. 12500 → "₹12,500.00"
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number as compact currency.
 * e.g. 125000 → "₹1.25L"
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrencyCompact(amount) {
  if (!amount && amount !== 0) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
}

// -----------------------------------------------------------
// String Utilities
// -----------------------------------------------------------

/**
 * Get initials from a full name.
 * e.g. "Manya Singh" → "MS"
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncate a string to maxLength characters with ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 40) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '…';
}

/**
 * Escape HTML special chars to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str ?? '')));
  return div.innerHTML;
}

// -----------------------------------------------------------
// Status / Role Badge HTML Generators
// -----------------------------------------------------------

/**
 * Generate a status badge HTML string.
 * @param {'PENDING'|'APPROVED'|'REJECTED'} status
 * @returns {string}
 */
export function statusBadge(status) {
  const map = {
    PENDING:  { cls: 'badge-pending',  label: 'Pending'  },
    APPROVED: { cls: 'badge-approved', label: 'Approved' },
    REJECTED: { cls: 'badge-rejected', label: 'Rejected' },
  };
  const s = map[status] || { cls: 'badge-pending', label: status || '—' };
  return `<span class="badge ${s.cls}">${escapeHTML(s.label)}</span>`;
}

/**
 * Generate a role badge HTML string.
 * @param {'EMP'|'RM'|'APE'|'CFO'} role
 * @returns {string}
 */
export function roleBadge(role) {
  const map = {
    EMP: { cls: 'badge-emp', label: 'Employee' },
    RM:  { cls: 'badge-rm',  label: 'Manager'  },
    APE: { cls: 'badge-ape', label: 'APE'       },
    CFO: { cls: 'badge-cfo', label: 'CFO'       },
  };
  const r = map[role] || { cls: 'badge-emp', label: role || '—' };
  return `<span class="badge ${r.cls}">${r.label}</span>`;
}

// -----------------------------------------------------------
// Number Utilities
// -----------------------------------------------------------

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Sum an array of numbers or object values by key.
 * @param {Array}  arr
 * @param {string} [key] — if provided, sums arr[key]
 * @returns {number}
 */
export function sumBy(arr, key) {
  if (!Array.isArray(arr)) return 0;
  return arr.reduce((acc, item) => acc + (Number(key ? item[key] : item) || 0), 0);
}

// -----------------------------------------------------------
// DOM Utilities
// -----------------------------------------------------------

/**
 * Safely query a selector and return null (no throw).
 * @param {string}      selector
 * @param {HTMLElement} [parent=document]
 * @returns {HTMLElement|null}
 */
export function qs(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Safely query all matching elements.
 * @param {string}      selector
 * @param {HTMLElement} [parent=document]
 * @returns {NodeList}
 */
export function qsa(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number}   delay — ms
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
