/**
 * navbar.js
 * Top navigation bar component.
 * Shows page title, user avatar, and mobile hamburger.
 *
 * Usage:
 *   import Navbar from '../components/navbar.js';
 *   Navbar.render({ title: 'Dashboard', user: { name, role } });
 *   Navbar.setTitle('Employees'); // update title dynamically
 */

import { ROLES } from '../utils/constants.js';

/** Role display labels */
const ROLE_LABELS = {
  [ROLES.EMP]: 'Employee',
  [ROLES.RM]:  'Reporting Manager',
  [ROLES.APE]: 'Accounts Payable Executive',
  [ROLES.CFO]: 'Chief Financial Officer',
};

class NavbarManager {
  constructor() {
    this._el = null;
  }

  /**
   * Render the navbar into #navbar.
   * @param {Object} opts
   * @param {string} opts.title   — page title to display
   * @param {Object} opts.user    — { name, role }
   */
  render({ title = 'Dashboard', user = {} } = {}) {
    this._el = document.getElementById('navbar');
    if (!this._el) {
      console.warn('Navbar: #navbar element not found.');
      return;
    }

    const roleLabel = ROLE_LABELS[user?.role] || user?.role || '';

    this._el.innerHTML = `
      <!-- Mobile hamburger -->
      <button
        class="sidebar-toggle"
        id="sidebar-toggle-btn"
        aria-label="Toggle sidebar"
        aria-expanded="false"
        aria-controls="sidebar"
      >
        ☰
      </button>

      <!-- Page title -->
      <h1 class="navbar-title" id="navbar-title">${this._escape(title)}</h1>

      <!-- Right actions -->
      <div class="navbar-actions">
        <!-- Role badge -->
        <span class="badge ${this._roleBadgeClass(user?.role)}" aria-label="Your role">
          ${this._escape(user?.role || '')}
        </span>

        <!-- User avatar with dropdown trigger -->
        <div class="navbar-user" id="navbar-user" title="${this._escape(user?.name || '')} — ${this._escape(roleLabel)}">
          <div class="avatar" aria-label="User: ${this._escape(user?.name || '')}">
            ${this._initials(user?.name)}
          </div>
        </div>
      </div>
    `;

    // Wire hamburger to update aria-expanded
    const toggle = document.getElementById('sidebar-toggle-btn');
    toggle?.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
    });
  }

  /**
   * Update the page title in the navbar without re-rendering.
   * @param {string} title
   */
  setTitle(title) {
    const el = document.getElementById('navbar-title');
    if (el) el.textContent = title;
  }

  /* -------------------------------------------------------
     Utility
  ------------------------------------------------------- */

  _roleBadgeClass(role) {
    const map = {
      [ROLES.EMP]: 'badge-emp',
      [ROLES.RM]:  'badge-rm',
      [ROLES.APE]: 'badge-ape',
      [ROLES.CFO]: 'badge-cfo',
    };
    return map[role] || 'badge-emp';
  }

  _initials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }

  _escape(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str ?? '')));
    return div.innerHTML;
  }
}

const Navbar = new NavbarManager();
export default Navbar;
