import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateAssign } from './dto/assign.dto.js';
import {
  listEmployeeController,
  assignController,
  deleteController,
} from './employees.controller.js';

const router = Router();

/**
 * GET /rest/employees/
 * Accessible to RM, APE, CFO — NOT EMP.
 */
router.get(
  '/',
  authMiddleware,
  (req, res, next) => {
    if (req.user.role === 'EMP') {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  },
  listEmployeeController
);

/**
 * POST /rest/employees/assign
 * CFO only — assigns an EMP to an RM.
 */
router.post(
  '/assign',
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== 'CFO') {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  },
  validateAssign,
  assignController
);

/**
 * DELETE /rest/employees/assign
 * CFO only — removes EMP-RM assignment.
 */
router.delete(
  '/assign',
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== 'CFO') {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    next();
  },
  validateAssign,
  deleteController
);

export default router;
