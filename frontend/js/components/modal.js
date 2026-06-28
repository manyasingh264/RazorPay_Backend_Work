/**
 * modal.js
 * Reusable modal component.
 *
 * Usage — Confirmation dialog:
 *   import Modal from '../components/modal.js';
 *   const confirmed = await Modal.confirm({
 *     title: 'Delete Employee?',
 *     message: 'This action cannot be undone.',
 *     confirmText: 'Delete',
 *     type: 'danger'
 *   });
 *   if (confirmed) { ... }
 *
 * Usage — Form modal:
 *   Modal.open({
 *     title: 'Submit Reimbursement',
 *     bodyHTML: `<form id="reimb-form">...</form>`,
 *     onConfirm: () => { ... }
 *   });
 */

class ModalManager {
  constructor() {
    this._overlay = null;
    this._activeResolve = null;
  }

  /**
   * Open a modal with arbitrary HTML content.
   * @param {Object} options
   * @param {string}   options.title
   * @param {string}   options.bodyHTML
   * @param {string}   [options.confirmText='Confirm']
   * @param {string}   [options.cancelText='Cancel']
   * @param {'danger'|'primary'|'success'} [options.confirmVariant='primary']
   * @param {Function} [options.onConfirm]
   * @param {Function} [options.onCancel]
   * @param {boolean}  [options.hideFooter=false]
   * @param {string}   [options.size='md']  — 'sm' | 'md' | 'lg'
   */
  open({
    title,
    bodyHTML,
    confirmText   = 'Confirm',
    cancelText    = 'Cancel',
    confirmVariant = 'primary',
    onConfirm     = null,
    onCancel      = null,
    hideFooter    = false,
    size          = 'md',
  } = {}) {
    // Remove any existing modal
    this.close();

    const maxWidths = { sm: '400px', md: '520px', lg: '680px' };

    this._overlay = document.createElement('div');
    this._overlay.className = 'modal-overlay';
    this._overlay.setAttribute('role', 'dialog');
    this._overlay.setAttribute('aria-modal', 'true');
    this._overlay.setAttribute('aria-labelledby', 'modal-title');

    this._overlay.innerHTML = `
      <div class="modal-container" style="max-width: ${maxWidths[size] || maxWidths.md}">
        <div class="modal-header">
          <h2 class="modal-title" id="modal-title">${this._escape(title)}</h2>
          <button class="modal-close-btn" id="modal-close-x" aria-label="Close modal">✕</button>
        </div>
        <div class="modal-body">
          ${bodyHTML}
        </div>
        ${!hideFooter ? `
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel-btn">${this._escape(cancelText)}</button>
          <button class="btn btn-${confirmVariant}" id="modal-confirm-btn">${this._escape(confirmText)}</button>
        </div>
        ` : ''}
      </div>
    `;

    // Wire up close/cancel
    this._overlay.querySelector('#modal-close-x').addEventListener('click', () => {
      onCancel?.();
      this.close();
    });

    if (!hideFooter) {
      this._overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => {
        onCancel?.();
        this.close();
      });

      this._overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        onConfirm?.();
      });
    }

    // Close on overlay backdrop click
    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) {
        onCancel?.();
        this.close();
      }
    });

    // Close on Escape key
    this._escHandler = (e) => {
      if (e.key === 'Escape') {
        onCancel?.();
        this.close();
      }
    };
    document.addEventListener('keydown', this._escHandler);

    document.body.appendChild(this._overlay);
    document.body.style.overflow = 'hidden';

    // Focus trap — focus first focusable element
    requestAnimationFrame(() => {
      const firstFocusable = this._overlay.querySelector(
        'input, textarea, select, button:not([aria-label="Close modal"])'
      );
      firstFocusable?.focus();
    });

    return this._overlay;
  }

  /**
   * Show a confirmation dialog. Returns a Promise<boolean>.
   * @param {Object} options
   */
  confirm({
    title,
    message,
    confirmText   = 'Confirm',
    cancelText    = 'Cancel',
    type          = 'danger',
    icon          = null,
  } = {}) {
    const iconMap = {
      danger:  '🗑',
      warning: '⚠️',
      success: '✓',
      info:    'ℹ️',
    };

    const displayIcon = icon || iconMap[type] || iconMap.warning;

    return new Promise((resolve) => {
      this.open({
        title,
        bodyHTML: `
          <div class="modal-confirm-icon ${type}" aria-hidden="true">
            ${displayIcon}
          </div>
          <div class="modal-confirm-text">
            <p class="modal-confirm-desc">${this._escape(message)}</p>
          </div>
        `,
        confirmText,
        cancelText,
        confirmVariant: type === 'danger' ? 'danger' : 'primary',
        onConfirm: () => {
          this.close();
          resolve(true);
        },
        onCancel: () => {
          resolve(false);
        },
      });
    });
  }

  /**
   * Set loading state on the confirm button.
   * @param {boolean} loading
   * @param {string}  [text='Processing...']
   */
  setLoading(loading, text = 'Processing...') {
    const btn = this._overlay?.querySelector('#modal-confirm-btn');
    if (!btn) return;
    if (loading) {
      btn.classList.add('btn-loading');
      btn.disabled = true;
      btn._originalText = btn.textContent;
    } else {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
      if (btn._originalText) btn.textContent = btn._originalText;
    }
  }

  /** Close and remove the active modal */
  close() {
    if (!this._overlay) return;
    document.removeEventListener('keydown', this._escHandler);
    this._overlay.classList.add('hiding');
    this._overlay.addEventListener('animationend', () => {
      this._overlay?.remove();
      this._overlay = null;
    }, { once: true });
    document.body.style.overflow = '';
  }

  /** Get the modal body element for dynamic content updates */
  getBody() {
    return this._overlay?.querySelector('.modal-body') || null;
  }

  /** Get the confirm button for external control */
  getConfirmBtn() {
    return this._overlay?.querySelector('#modal-confirm-btn') || null;
  }

  _escape(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str ?? '')));
    return div.innerHTML;
  }
}

const Modal = new ModalManager();
export default Modal;
