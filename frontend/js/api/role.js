/**
 * role.js
 * Raw HTTP calls for role assignment.
 *
 * Endpoints:
 *   POST /rest/roles/assign   → assign a role to a user (CFO only)
 */

import { apiClient } from './auth.js';

/**
 * Assign a role to a user. (CFO only)
 * Backend validates that the requesting user is CFO.
 * Assignable roles: EMP, RM, APE (CFO is seeded, cannot be assigned).
 *
 * @param {{ userId: string, role: 'EMP'|'RM'|'APE' }} payload
 * @returns {Promise<{ status: string, data: Object }>}
 */
export async function assignRole({ userId, role }) {
  return apiClient('/rest/roles/assign', {
    method: 'POST',
    body: JSON.stringify({ user: userId, role }),
  });
}
