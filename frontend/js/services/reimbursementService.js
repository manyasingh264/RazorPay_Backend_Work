/**
 * reimbursementService.js
 * Business logic on top of the reimbursement API.
 * Handles filtering, counting, and formatting for each role.
 *
 * Usage:
 *   import ReimbursementService from '../services/reimbursementService.js';
 *   const stats = await ReimbursementService.getDashboardStats();
 *   const list  = await ReimbursementService.getForCurrentUser(user);
 */

import {
  getReimbursements,
  getUserReimbursements,
  submitReimbursement,
  approveReimbursement,
} from '../api/reimbursement.js';

import { STATUS, ROLES } from '../utils/constants.js';

class ReimbursementService {

  // -----------------------------------------------------------
  // Fetch reimbursements (role-aware)
  // -----------------------------------------------------------

  /**
   * Fetch reimbursements relevant to the current role.
   * @returns {Promise<Array>}
   */
  async getAll() {
    const response = await getReimbursements();
    return response?.data?.reimbursements || [];
  }

  /**
   * Fetch all reimbursements for a specific user.
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getByUser(userId) {
    const response = await getUserReimbursements(userId);
    return response?.data?.reimbursements || [];
  }

  // -----------------------------------------------------------
  // Submit
  // -----------------------------------------------------------

  /**
   * Submit a new reimbursement request.
   * @param {{ title, description, amount }} payload
   * @returns {Promise<Object>}
   */
  async submit(payload) {
    const response = await submitReimbursement(payload);
    return response?.data || response;
  }

  // -----------------------------------------------------------
  // Approve / Reject
  // -----------------------------------------------------------

  /**
   * Approve a reimbursement for a specific employee.
   * @param {string} userId — the EMP's userId
   * @returns {Promise<Object>}
   */
  async approve(userId) {
    return approveReimbursement({ userId, status: STATUS.APPROVED });
  }

  /**
   * Reject a reimbursement for a specific employee.
   * @param {string} userId — the EMP's userId
   * @returns {Promise<Object>}
   */
  async reject(userId) {
    return approveReimbursement({ userId, status: STATUS.REJECTED });
  }

  // -----------------------------------------------------------
  // Dashboard stats (derived from reimbursement list)
  // -----------------------------------------------------------

  /**
   * Compute dashboard stat cards from a reimbursements array.
   * @param {Array}  reimbursements
   * @param {string} role
   * @returns {{
   *   total: number,
   *   pending: number,
   *   approved: number,
   *   rejected: number,
   *   totalAmount: number,
   *   pendingAmount: number,
   *   approvedAmount: number,
   * }}
   */
  computeStats(reimbursements) {
    if (!Array.isArray(reimbursements)) {
      return { total: 0, pending: 0, approved: 0, rejected: 0,
               totalAmount: 0, pendingAmount: 0, approvedAmount: 0 };
    }

    const pending  = reimbursements.filter((r) => r.status === STATUS.PENDING);
    const approved = reimbursements.filter((r) => r.status === STATUS.APPROVED);
    const rejected = reimbursements.filter((r) => r.status === STATUS.REJECTED);

    const sum = (arr) => arr.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

    return {
      total:          reimbursements.length,
      pending:        pending.length,
      approved:       approved.length,
      rejected:       rejected.length,
      totalAmount:    sum(reimbursements),
      pendingAmount:  sum(pending),
      approvedAmount: sum(approved),
    };
  }

  /**
   * Get recent N reimbursements sorted by date (newest first).
   * @param {Array}  reimbursements
   * @param {number} [limit=5]
   * @returns {Array}
   */
  getRecent(reimbursements, limit = 5) {
    if (!Array.isArray(reimbursements)) return [];
    return [...reimbursements]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, limit);
  }

  /**
   * Filter reimbursements by status.
   * @param {Array}  reimbursements
   * @param {string} status
   * @returns {Array}
   */
  filterByStatus(reimbursements, status) {
    if (!status || status === 'ALL') return reimbursements;
    return reimbursements.filter((r) => r.status === status);
  }
}

export default new ReimbursementService();
