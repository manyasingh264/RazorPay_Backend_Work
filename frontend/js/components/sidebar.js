/**
 * sidebar.js
 * Role-aware sidebar navigation component.
 * Renders different nav items per role and handles
 * active state, mobile toggle, and logout.
 *
 * Usage:
 *   import Sidebar from '../components/sidebar.js';
 *   Sidebar.render({ user: { name, email, role } });
 */

import { ROLES, PAGES } from '../utils/constants.js';
import { logout }       from '../api/auth.js';
import Toast            from './toast.js';

/** Nav items per role — order matters (display order) */
const NAV_CONFIG = {
  [ROLES.EMP]: [
    { icon: '⊞', label: 'Dashboard',         page: PAGES.DASHBOARD,       id: 'nav-dashboard' },
    { icon: '📄', label: 'My Reimbursements', page: PAGES.REIMBURSEMENTS,  id: 'nav-reimbursements' },
  ],
  [ROLES.RM]: [
    { icon: '⊞', label: 'Dashboard',  page: PAGES.DASHBOARD,      id: 'nav-dashboard' },
    { icon: '👥', label: 'Employees',  page: PAGES.EMPLOYEES,      id: 'nav-employees' },
    { icon: '✅', label: 'Approvals',  page: PAGES.REIMBURSEMENTS, id: 'nav-reimbursements' },
  ],
  [ROLES.APE]: [
    { icon: '⊞', label: 'Dashboard',  page: PAGES.DASHBOARD,      id: 'nav-dashboard' },
    { icon: '✅', label: 'Approvals',  page: PAGES.REIMBURSEMENTS, id: 'nav-reimbursements' },
  ],
  [ROLES.CFO]: [
    { icon: '⊞', label: 'Dashboard',  page: PAGES.DASHBOARD,      id: 'nav-dashboard' },
    { icon: '👥', label: 'Employees',  page: PAGES.EMPLOYEES,      id: 'nav-employees' },
    { icon: '🔑', label: 'Roles',      page: PAGES.ROLES,          id: 'nav-roles' },
    { icon: '✅', label: 'Approvals',  page: PAGES.REIMBURSEMENTS, id: 'nav-reimbursements' },
  ],
};

class SidebarManager {
  constructor() {
    this._el          = null;
    this._overlay     = null;
    this._isOpen      = false;
    this._currentPage = null;
  }

  /**
   * Render the sidebar into #sidebar.
   * @param {{ user: { name: string, email: string, role: string } }} opts
   */
  render({ user }) {
    this._el      = document.getElementById('sidebar');
    this._overlay = document.getElementById('sidebar-overlay');

    if (!this._el) {
      console.warn('Sidebar: #sidebar element not found.');
      return;
    }

    const role    = user?.role || ROLES.EMP;
    const navItems = NAV_CONFIG[role] || NAV_CONFIG[ROLES.EMP];

    // Detect current active page from URL
    this._currentPage = this._detectCurrentPage();

    this._el.innerHTML = `
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon" aria-hidden="true">💸</div>
        <div>
          <div class="sidebar-logo-text">ReimburseApp</div>
          <div class="sidebar-logo-sub">v1.0</div>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        <span class="sidebar-section-label">Navigation</span>
        ${navItems.map((item) => this._buildNavItem(item)).join('')}
      </nav>

      <!-- User footer -->
      <div class="sidebar-footer">
        <div class="sidebar-user" id="sidebar-user-info" title="${this._escape(user?.email || '')}">
          <div class="avatar avatar-sm">${this._initials(user?.name)}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${this._escape(user?.name || 'User')}</div>
            <div class="sidebar-user-role">${this._escape(role)}</div>
          </div>
        </div>
        <button class="sidebar-link" id="sidebar-logout-btn" aria-label="Logout">
          <span class="sidebar-link-icon" aria-hidden="true">↩</span>
          <span class="sidebar-link-text">Logout</span>
        </button>
      </div>
    `;

    this._attachNavListeners();
    this._attachLogoutListener();
    this._attachMobileListeners();
  }

  /* -------------------------------------------------------
     Private: Build a single nav item
  ------------------------------------------------------- */

  _buildNavItem(item) {
    const isActive = this._currentPage === item.page;
    return `
      <a
        href="${item.page}"
        class="sidebar-link ${isActive ? 'active' : ''}"
        id="${item.id}"
        aria-current="${isActive ? 'page' : 'false'}"
      >
        <span class="sidebar-link-icon" aria-hidden="true">${item.icon}</span>
        <span class="sidebar-link-text">${item.label}</span>
      </a>
    `;
  }

  /* -------------------------------------------------------
     Private: Detect current active page from filename
  ------------------------------------------------------- */

  _detectCurrentPage() {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'dashboard.html';
    // Map filename → PAGES constant
    const map = {
      'dashboard.html':      PAGES.DASHBOARD,
      'reimbursements.html': PAGES.REIMBURSEMENTS,
      'employees.html':      PAGES.EMPLOYEES,
      'roles.html':          PAGES.ROLES,
    };
    return map[file] || PAGES.DASHBOARD;
  }

  /* -------------------------------------------------------
     Private: Attach nav click listeners (SPA-style)
  ------------------------------------------------------- */

  _attachNavListeners() {
    this._el.querySelectorAll('.sidebar-link[href]').forEach((link) => {
      link.addEventListener('click', () => {
        // Close mobile sidebar on nav click
        if (this._isOpen) this.close();
      });
    });
  }

  /* -------------------------------------------------------
     Private: Logout
  ------------------------------------------------------- */

  _attachLogoutListener() {
    const btn = document.getElementById('sidebar-logout-btn');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.querySelector('.sidebar-link-text').textContent = 'Logging out…';
      try {
        await logout();
        window.location.href = PAGES.LOGIN;
      } catch (err) {
        Toast.error('Logout failed', err.message || 'Please try again.');
        btn.disabled = false;
        btn.querySelector('.sidebar-link-text').textContent = 'Logout';
      }
    });
  }

  /* -------------------------------------------------------
     Private: Mobile toggle
  ------------------------------------------------------- */

  _attachMobileListeners() {
    // Hamburger toggle button (in navbar)
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    toggleBtn?.addEventListener('click', () => this.toggle());

    // Overlay click closes sidebar
    this._overlay?.addEventListener('click', () => this.close());
  }

  toggle() {
    this._isOpen ? this.close() : this.open();
  }

  open() {
    this._isOpen = true;
    this._el?.classList.add('open');
    this._overlay?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this._isOpen = false;
    this._el?.classList.remove('open');
    this._overlay?.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Set a badge count on a nav item.
   * @param {string} navId   — e.g. 'nav-reimbursements'
   * @param {number} count
   */
  setBadge(navId, count) {
    const link = document.getElementById(navId);
    if (!link) return;
    let badge = link.querySelector('.sidebar-link-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'sidebar-link-badge';
        link.appendChild(badge);
      }
      badge.textContent = count > 99 ? '99+' : count;
    } else {
      badge?.remove();
    }
  }

  /* -------------------------------------------------------
     Utility
  ------------------------------------------------------- */

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

const Sidebar = new SidebarManager();
export default Sidebar;
