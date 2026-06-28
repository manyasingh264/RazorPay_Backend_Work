/**
 * auth.js
 * Raw HTTP calls for authentication endpoints.
 * All requests use credentials: 'include' for cookie-based auth.
 *
 * Endpoints:
 *   POST /rest/onboardings/register
 *   POST /rest/onboardings/login
 *   POST /rest/onboardings/logout
 *   GET  /rest/onboardings/me  ← (inferred "who am I" endpoint)
 */

import { API_BASE_URL } from '../utils/constants.js';

// -----------------------------------------------------------
// Core fetch wrapper
// Automatically:
//  - Attaches credentials: 'include' (required for cookies)
//  - Sets Content-Type: application/json
//  - Parses JSON responses
//  - Throws descriptive errors on 4xx / 5xx
// -----------------------------------------------------------

/**
 * @param {string} path    — relative path e.g. '/rest/onboardings/login'
 * @param {Object} [opts]  — fetch options
 * @returns {Promise<any>}
 * @throws {Error} with message from server or generic message
 */
async function apiClient(path, opts = {}) {
  const url = `${API_BASE_URL}${path}`;

  const defaultHeaders = {};
  // Only set Content-Type if we're sending a body
  if (opts.body && typeof opts.body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const config = {
    ...opts,
    credentials: 'include',   // CRITICAL: send/receive cookies
    headers: {
      ...defaultHeaders,
      ...opts.headers,
    },
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new Error('Network error — please check your connection.');
  }

  // Parse response body (handle empty body gracefully)
  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  // Handle HTTP errors
  if (!response.ok) {
    const message =
      data?.message ||
      data?.error   ||
      `Request failed with status ${response.status}`;

    const err = new Error(message);
    err.status = response.status;
    err.data   = data;

    // 401 — session expired
    if (response.status === 401) {
      err.isUnauthorized = true;
    }
    // 403 — forbidden
    if (response.status === 403) {
      err.isForbidden = true;
    }

    throw err;
  }

  return data;
}

// Export the client so other api/ files can reuse it
export { apiClient };

// -----------------------------------------------------------
// Auth API functions
// -----------------------------------------------------------

/**
 * Register a new user.
 * @param {{ name: string, email: string, password: string }} payload
 * @returns {Promise<{ status: string, data: { user: Object } }>}
 */
export async function register({ name, email, password }) {
  return apiClient('/rest/onboardings/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

/**
 * Login a user.
 * On success the server sets an HTTP-only auth cookie.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ status: string, data: { user: Object } }>}
 */
export async function login({ email, password }) {
  return apiClient('/rest/onboardings/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Logout the current user.
 * Server clears the auth cookie.
 * @returns {Promise<{ status: string }>}
 */
export async function logout() {
  return apiClient('/rest/onboardings/logout', {
    method: 'POST',
  });
}

/**
 * Get the currently authenticated user.
 * Used by the router to verify session on page load.
 * NOTE: If your backend doesn't have a /me endpoint,
 * we derive the user from the cookie payload or session.
 *
 * This function tries the /me endpoint first;
 * authService.js handles the fallback via sessionStorage.
 *
 * @returns {Promise<{ userId, name, email, role } | null>}
 */
export async function getMe() {
  try {
    const data = await apiClient('/rest/onboardings/me', {
      method: 'GET',
    });
    return data?.data?.user || data?.user || null;
  } catch (err) {
    // 401 means not authenticated — return null (don't throw)
    if (err.status === 401 || err.status === 404) return null;
    throw err;
  }
}
