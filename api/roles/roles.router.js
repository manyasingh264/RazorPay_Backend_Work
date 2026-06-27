import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validateRoles } from './dto/roles.dto.js';
import { assignRoleController } from './roles.controller.js';

const router = Router();

/**
 * POST /rest/roles/assign
 * Only CFO can assign roles. All other roles receive 403 Forbidden.
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
  validateRoles,
  assignRoleController
);

export default router;
