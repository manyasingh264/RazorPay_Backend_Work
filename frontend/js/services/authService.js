/**
 * authService.js
 * Business logic on top of the auth API layer.
 * Handles session state, user caching, and login/logout flows.
 *
 * Usage:
 *   import AuthService from '../services/authService.js';
 *   const user = await AuthService.login({ email, password });
 *   const user = AuthService.getUser();   // sync — from cache
 *   AuthService.clearUser();
 */

import { login, logout, register, getMe } from '../api/auth.js';
import { SESSION_KEY }                     from '../utils/constants.js';
import Router                              from '../utils/router.js';

class _AuthService {
  constructor() {
    // In-memory cache of the current user
    this._user = null;
  }

  // -----------------------------------------------------------
  // Login
  // -----------------------------------------------------------

  /**
   * Login and cache the user.
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ userId, name, email, role }>}
   */
  async login(credentials) {
    const response = await login(credentials);

    // Backend response: { status: 'success', data: { user: { ... } } }
    const user = response?.data?.user || response?.user;
    if (!user) throw new Error('Unexpected server response after login.');

    this._user = user;
    Router._saveSession(user);
    return user;
  }

  // -----------------------------------------------------------
  // Register
  // -----------------------------------------------------------

  /**
   * Register a new account.
   * Does NOT auto-login (user needs CFO to assign a role first).
   * @param {{ name: string, email: string, password: string }} payload
   * @returns {Promise<Object>}
   */
  async register(payload) {
    const response = await register(payload);
    return response?.data?.user || response?.user || response;
  }

  // -----------------------------------------------------------
  // Logout
  // -----------------------------------------------------------

  /**
   * Logout, clear cache, and redirect to login.
   */
  async logout() {
    try {
      await logout();
    } finally {
      this.clearUser();
      Router.toLogin();
    }
  }

  // -----------------------------------------------------------
  // Get current user
  // -----------------------------------------------------------

  /**
   * Get the current user synchronously from cache.
   * Returns null if not set yet.
   * @returns {{ userId, name, email, role } | null}
   */
  getUser() {
    if (this._user) return this._user;
    // Fallback to sessionStorage
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      this._user = JSON.parse(raw);
      return this._user;
    } catch {
      return null;
    }
  }

  /**
   * Get the current user, fetching from server if not cached.
   * @returns {Promise<{ userId, name, email, role } | null>}
   */
  async getUserAsync() {
    if (this._user) return this._user;
    const cached = this.getUser();
    if (cached) return cached;

    try {
      const user = await getMe();
      if (user) {
        this._user = user;
        Router._saveSession(user);
      }
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Get just the current user's role.
   * @returns {string|null}
   */
  getRole() {
    return this.getUser()?.role || null;
  }

  /**
   * Check if the current user has one of the given roles.
   * @param {string|string[]} roles
   * @returns {boolean}
   */
  hasRole(roles) {
    const currentRole = this.getRole();
    if (!currentRole) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(currentRole);
  }

  // -----------------------------------------------------------
  // Clear session
  // -----------------------------------------------------------

  clearUser() {
    this._user = null;
    Router.clearSession();
  }
}

const AuthService = new _AuthService();
export default AuthService;
