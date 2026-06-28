/**
 * loader.js
 * Page-level and inline loading states.
 *
 * Usage:
 *   import Loader from '../components/loader.js';
 *
 *   Loader.show();          // full-page overlay spinner
 *   Loader.hide();
 *
 *   Loader.showInline(containerEl, 'Loading data...');
 *   Loader.hideInline(containerEl);
 *
 *   Loader.skeleton(containerEl, 5); // 5 skeleton rows in a table
 */

class LoaderManager {
  constructor() {
    this._pageLoader = null;
    this._init();
  }

  /** Create the full-page loader DOM node once */
  _init() {
    if (document.getElementById('page-loader')) {
      this._pageLoader = document.getElementById('page-loader');
      return;
    }
    this._pageLoader = document.createElement('div');
    this._pageLoader.id = 'page-loader';
    this._pageLoader.className = 'page-loader hidden';
    this._pageLoader.setAttribute('role', 'status');
    this._pageLoader.setAttribute('aria-label', 'Loading');
    this._pageLoader.innerHTML = `
      <div class="spinner"></div>
      <span class="loader-text" id="page-loader-text">Loading…</span>
    `;
    document.body.appendChild(this._pageLoader);
  }

  /**
   * Show the full-page blocking spinner.
   * @param {string} [text='Loading…']
   */
  show(text = 'Loading…') {
    if (!this._pageLoader) this._init();
    const label = this._pageLoader.querySelector('#page-loader-text');
    if (label) label.textContent = text;
    this._pageLoader.classList.remove('hidden');
  }

  /** Hide the full-page spinner */
  hide() {
    this._pageLoader?.classList.add('hidden');
  }

  /**
   * Replace a container's content with an inline spinner.
   * Saves original content so hideInline() can restore it.
   * @param {HTMLElement} container
   * @param {string}      [text='Loading…']
   */
  showInline(container, text = 'Loading…') {
    if (!container) return;
    container._savedContent = container.innerHTML;
    container.innerHTML = `
      <div class="inline-loader">
        <div class="spinner spinner-sm"></div>
        <span>${text}</span>
      </div>
    `;
  }

  /**
   * Restore a container's content after showInline().
   * @param {HTMLElement} container
   */
  hideInline(container) {
    if (!container || container._savedContent === undefined) return;
    container.innerHTML = container._savedContent;
    delete container._savedContent;
  }

  /**
   * Inject N skeleton rows into a <tbody>.
   * Each row has 5 placeholder cells by default.
   * @param {HTMLElement} tbody    — the <tbody> element
   * @param {number}      rows     — number of skeleton rows
   * @param {number}      [cols=5] — number of columns
   */
  skeleton(tbody, rows = 5, cols = 5) {
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement('tr');
      tr.className = 'skeleton-row';

      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        const widths = ['w-40', 'w-60', 'w-30', 'w-80', 'w-20'];
        // First cell — avatar + text
        if (c === 0) {
          td.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px">
              <div class="skeleton skeleton-avatar"></div>
              <div class="skeleton skeleton-text w-60"></div>
            </div>
          `;
        } else if (c === cols - 1) {
          // Last cell — badge placeholder
          td.innerHTML = `<div class="skeleton skeleton-badge"></div>`;
        } else {
          td.innerHTML = `<div class="skeleton skeleton-text ${widths[c % widths.length]}"></div>`;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
  }

  /**
   * Show a skeleton card grid (for stat cards).
   * @param {HTMLElement} container  — the .stats-grid element
   * @param {number}      count      — number of cards
   */
  skeletonCards(container, count = 4) {
    if (!container) return;
    container._savedContent = container.innerHTML;
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="skeleton skeleton-avatar" style="width:40px;height:40px;border-radius:8px;margin-bottom:16px;"></div>
        <div class="skeleton skeleton-text w-40" style="margin-bottom:8px;height:12px;"></div>
        <div class="skeleton skeleton-text w-30" style="height:28px;margin-bottom:6px;"></div>
        <div class="skeleton skeleton-text w-60" style="height:10px;"></div>
      `;
      container.appendChild(card);
    }
  }

  /** Restore a container after skeletonCards() */
  clearSkeleton(container) {
    if (!container || container._savedContent === undefined) return;
    container.innerHTML = container._savedContent;
    delete container._savedContent;
  }
}

const Loader = new LoaderManager();
export default Loader;
