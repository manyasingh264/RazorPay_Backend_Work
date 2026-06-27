import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validatePostReimbursement } from './dto/postReimbursement.dto.js';
import { validatePatchReimbursement } from './dto/patchReimbursement.dto.js';
import {
  getReimbursement,
  getUserReimbursement,
  postReimbursement,
  approveReimbursement,
} from './reimbursement.controller.js';

const router = Router();

/**
 * GET /rest/reimbursements/
 * All authenticated users — role-filtered in controller.
 */
router.get('/', authMiddleware, getReimbursement);

/**
 * GET /rest/reimbursements/:userId
 * Access: own records | RM of that EMP | APE | CFO
 */
router.get('/:userId', authMiddleware, getUserReimbursement);

/**
 * POST /rest/reimbursements/
 * EMP only — submit a new reimbursement.
 */
router.post(
  '/',
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== 'EMP') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: only EMPs can submit reimbursements',
      });
    }
    next();
  },
  validatePostReimbursement,
  postReimbursement
);

/**
 * PATCH /rest/reimbursements/
 * RM, APE, CFO only (EMP cannot approve).
 */
router.patch(
  '/',
  authMiddleware,
  (req, res, next) => {
    if (req.user.role === 'EMP') {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  },
  validatePatchReimbursement,
  approveReimbursement
);

export default router;
