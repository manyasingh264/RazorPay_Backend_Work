/**
 * router.js
 * Client-side route protection and navigation.
 *
 * How it works:
 *  1. Every protected page calls Router.guard() on load.
 *  2. guard() reads the stored session from sessionStorage.
 *  3. If no session → redirect to login.
 *  4. If session exists but role not allowed for this page → redirect to 403.
 *  5. Returns the user object so the page can render accordingly.
 *
 * Usage (at top of every protected page script):
 *   import Router from '../utils/router.js';
 *   const user = await Router.guard();
 *   // user = { userId, name, email, role }
 */

import {
  PAGES,
  SESSION_KEY,
  ROLE_ALLOWED_PAGES,
} from './constants.js';

import { getMe } from '../api/auth.js';

class Router {
  /**
   * Guard a protected page.
   * Call at the start of every dashboard page's init function.
   *
   * @param {Object}  [opts]
   * @param {boolean} [opts.requireAuth=true]  — redirect to login if no session
   * @returns {Promise<Object>}                — resolves with the user object
   */
  async guard({ requireAuth = true } = {}) {
    // 1. Try reading cached session (avoids extra network call)
    let user = this._getSession();

    // 2. If no cached session, attempt to refresh from server
    if (!user) {
      try {
        user = await getMe();
        if (user) this._saveSession(user);
      } catch {
        user = null;
      }
    }

    // 3. No authenticated user — redirect to login
    if (!user && requireAuth) {
      this.toLogin();
      // Return a never-resolving promise to halt page execution
      return new Promise(() => {});
    }

    // 4. Check role-based page access
    if (user) {
      const currentPage = this._getCurrentPage();
      const allowedPages = ROLE_ALLOWED_PAGES[user.role] || [];

      // Build a normalized list of page basenames for comparison
      const allowedBasenames = allowedPages.map((p) => p.split('/').pop());
      const currentBasename  = currentPage.split('/').pop();

      if (!allowedBasenames.includes(currentBasename)) {
        this.to403(user.role);
        return new Promise(() => {});
      }
    }

    return user;
  }

  /**
   * Guard an AUTH page (login/register).
   * If user is already logged in → redirect to dashboard.
   */
  async guardAuth() {
    const user = this._getSession();
    if (user) {
      window.location.href = PAGES.DASHBOARD;
      return new Promise(() => {});
    }
    // Also try a lightweight server check
    try {
      const serverUser = await getMe();
      if (serverUser) {
        this._saveSession(serverUser);
        window.location.href = PAGES.DASHBOARD;
        return new Promise(() => {});
      }
    } catch {
      // Not logged in — stay on auth page
    }
    return null;
  }

  // -----------------------------------------------------------
  // Navigation helpers
  // -----------------------------------------------------------

  toLogin() {
    this.clearSession();
    window.location.href = PAGES.LOGIN;
  }

  toDashboard() {
    window.location.href = PAGES.DASHBOARD;
  }

  to(page) {
    window.location.href = page;
  }

  to403(role) {
    // Build a simple 403 page inline rather than a separate file
    document.body.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Inter, sans-serif;
        background: #f9fafb;
        color: #111827;
        text-align: center;
        padding: 2rem;
      ">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🚫</div>
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">403 — Access Denied</h1>
        <p style="color: #6b7280; font-size: 1rem; margin-bottom: 2rem;">
          Your role (<strong>${role}</strong>) does not have permission to view this page.
        </p>
        <a href="${PAGES.DASHBOARD}" style="
          background: #2563eb;
          color: white;
          padding: 0.625rem 1.5rem;
          border-radius: 0.5rem;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.875rem;
        ">← Back to Dashboard</a>
      </div>
    `;
    document.title = '403 — Access Denied';
  }

  to404() {
    document.body.innerHTML = `
      <div style="
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Inter, sans-serif;
        background: #f9fafb;
        color: #111827;
        text-align: center;
        padding: 2rem;
      ">
        <div style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
        <h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem;">404 — Page Not Found</h1>
        <p style="color: #6b7280; font-size: 1rem; margin-bottom: 2rem;">
          The page you're looking for doesn't exist.
        </p>
        <a href="${PAGES.DASHBOARD}" style="
          background: #2563eb;
          color: white;
          padding: 0.625rem 1.5rem;
          border-radius: 0.5rem;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.875rem;
        ">← Back to Dashboard</a>
      </div>
    `;
    document.title = '404 — Not Found';
  }

  // -----------------------------------------------------------
  // Session management (sessionStorage — NOT sensitive data)
  // Role and display name are not secrets.
  // The real authentication is the HTTP-only cookie.
  // -----------------------------------------------------------

  /**
   * Save minimal user info to sessionStorage.
   * @param {{ userId: string, name: string, email: string, role: string }} user
   */
  _saveSession(user) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: user.userId || user.id,
        name:   user.name,
        email:  user.email,
        role:   user.role,
      }));
    } catch { /* storage quota exceeded — ignore */ }
  }

  /**
   * Read cached session from sessionStorage.
   * @returns {{ userId, name, email, role } | null}
   */
  _getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Validate it has the required fields
      if (!parsed.role || !parsed.userId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Clear session (on logout) */
  clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  // -----------------------------------------------------------
  // Utility
  // -----------------------------------------------------------

  _getCurrentPage() {
    return window.location.pathname;
  }
}

// Export singleton
export default new Router();
