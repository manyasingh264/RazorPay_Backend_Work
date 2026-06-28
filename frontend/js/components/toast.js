/**
 * toast.js
 * Reusable toast notification system.
 * Usage:
 *   import Toast from '../components/toast.js';
 *   Toast.success('Saved!', 'Your changes were saved.');
 *   Toast.error('Failed', 'Something went wrong.');
 *   Toast.warning('Warning', 'Check your input.');
 *   Toast.info('Note', 'Remember to save.');
 */

class ToastManager {
  constructor() {
    this._container = null;
    this._queue = [];
    this._init();
  }

  /** Create or retrieve the toast container DOM node */
  _init() {
    if (document.getElementById('toast-container')) {
      this._container = document.getElementById('toast-container');
      return;
    }
    this._container = document.createElement('div');
    this._container.id = 'toast-container';
    this._container.className = 'toast-container';
    this._container.setAttribute('role', 'region');
    this._container.setAttribute('aria-label', 'Notifications');
    this._container.setAttribute('aria-live', 'polite');
    document.body.appendChild(this._container);
  }

  /**
   * Show a toast notification.
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {string} title
   * @param {string} [message]
   * @param {number} [duration=4000]
   */
  show(type, title, message = '', duration = 4000) {
    // Ensure container exists (if called before DOM ready)
    if (!this._container) this._init();

    const icons = {
      success: '✓',
      error:   '✕',
      warning: '⚠',
      info:    'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.style.setProperty('--toast-duration', `${duration}ms`);

    // Set the progress bar duration via CSS custom property
    toast.style.cssText += `--toast-duration: ${duration}ms;`;

    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icons[type]}</span>
      <div class="toast-body">
        <div class="toast-title">${this._escape(title)}</div>
        ${message ? `<div class="toast-message">${this._escape(message)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss notification">✕</button>
    `;

    // Apply progress bar duration
    const styleEl = toast.querySelector('.toast::after');
    toast.style.setProperty('--duration', `${duration}ms`);

    // Manually set the progress bar animation via a style tag trick
    const progressStyle = document.createElement('style');
    const uid = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    toast.id = uid;
    progressStyle.textContent = `
      #${uid}::after { animation-duration: ${duration}ms; }
    `;
    document.head.appendChild(progressStyle);

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this._dismiss(toast, progressStyle);
    });

    this._container.appendChild(toast);

    // Auto-dismiss
    const timer = setTimeout(() => {
      this._dismiss(toast, progressStyle);
    }, duration);

    // Store reference so manual close can clear timer
    toast._timer = timer;

    return toast;
  }

  /** Animate out and remove a toast */
  _dismiss(toast, styleEl) {
    if (!toast || !toast.parentNode) return;
    clearTimeout(toast._timer);
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => {
      toast.remove();
      if (styleEl) styleEl.remove();
    }, { once: true });
  }

  /** Escape HTML to prevent XSS */
  _escape(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // Convenience methods
  success(title, message, duration) {
    return this.show('success', title, message, duration);
  }

  error(title, message, duration) {
    return this.show('error', title, message, duration);
  }

  warning(title, message, duration) {
    return this.show('warning', title, message, duration);
  }

  info(title, message, duration) {
    return this.show('info', title, message, duration);
  }
}

// Export a singleton so all modules share the same container
const Toast = new ToastManager();
export default Toast;
