/**
 * reimbursement.js
 * Raw HTTP calls for reimbursement endpoints.
 *
 * Endpoints:
 *   GET   /rest/reimbursements            → list (role-filtered by backend)
 *   GET   /rest/reimbursements/:userId    → list for a specific user
 *   POST  /rest/reimbursements            → submit new request (EMP only)
 *   PATCH /rest/reimbursements            → approve/reject (RM, APE, CFO)
 */

import { apiClient } from './auth.js';

/**
 * Get reimbursements.
 * Backend filters by role automatically:
 *  - EMP → own reimbursements
 *  - RM  → PENDING reimbursements from their EMPs
 *  - APE → reimbursements PENDING at APE level (already approved by RM)
 *  - CFO → reimbursements already approved by APE
 *
 * @returns {Promise<{ status: string, data: { reimbursements: Array } }>}
 */
export async function getReimbursements() {
  return apiClient('/rest/reimbursements', {
    method: 'GET',
  });
}

/**
 * Get all reimbursements for a specific user.
 * Accessible if:
 *  - Requesting user IS the target user
 *  - Requesting user is the target user's RM
 *  - Requesting user's role is APE or CFO
 *
 * @param {string} userId — the target user's ID
 * @returns {Promise<{ status: string, data: { reimbursements: Array } }>}
 */
export async function getUserReimbursements(userId) {
  return apiClient(`/rest/reimbursements/${userId}`, {
    method: 'GET',
  });
}

/**
 * Submit a new reimbursement request. (EMP only)
 * @param {{ title: string, description: string, amount: number }} payload
 * @returns {Promise<{ status: string, data: Object }>}
 */
export async function submitReimbursement({ title, description, amount }) {
  return apiClient('/rest/reimbursements', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      amount: parseFloat(amount),   // ensure numeric type
    }),
  });
}

/**
 * Approve or reject a reimbursement. (RM, APE, CFO)
 * @param {{ userId: string, status: 'APPROVED' | 'REJECTED' }} payload
 *   userId — the EMP's userId whose reimbursement to act on
 *   status — 'APPROVED' or 'REJECTED'
 * @returns {Promise<{ status: string, data: Object }>}
 */
export async function approveReimbursement({ userId, status }) {
  return apiClient('/rest/reimbursements', {
    method: 'PATCH',
    body: JSON.stringify({ userID: userId, status }),
  });
}
