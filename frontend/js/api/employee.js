/**
 * employee.js
 * Raw HTTP calls for employee management endpoints.
 *
 * Endpoints:
 *   GET    /rest/employees            → list employees (role-filtered by backend)
 *   POST   /rest/employees/assign     → assign EMP to RM  (CFO only)
 *   DELETE /rest/employees/assign     → remove EMP–RM link (CFO only)
 */

import { apiClient } from './auth.js';

/**
 * Get employees.
 * Backend automatically filters by role:
 *  - RM  → only their assigned EMPs
 *  - APE → all EMPs and RMs
 *  - CFO → all records
 *
 * @returns {Promise<{ status: string, data: { users: Array } }>}
 */
export async function getEmployees() {
  return apiClient('/rest/employees', {
    method: 'GET',
  });
}

/**
 * Assign an employee to a reporting manager. (CFO only)
 * @param {{ empId: string, rmId: string }} payload
 *   empId — the Employee's userId
 *   rmId  — the Reporting Manager's userId
 * @returns {Promise<{ status: string, data: Object }>}
 */
export async function assignEmployee({ empId, rmId }) {
  return apiClient('/rest/employees/assign', {
    method: 'POST',
    body: JSON.stringify({ empId, rmId }),
  });
}

/**
 * Remove an employee–manager assignment. (CFO only)
 * @param {{ empId: string, rmId: string }} payload
 * @returns {Promise<{ status: string }>}
 */
export async function removeAssignment({ empId, rmId }) {
  return apiClient('/rest/employees/assign', {
    method: 'DELETE',
    body: JSON.stringify({ empId, rmId }),
  });
}
