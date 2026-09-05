import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { validateRoleAssignment, checkValidation } from '../middleware/validation.middleware';
import * as roleController from '../controllers/role.controller';

const router = Router();

// POST /api/roles/assign — ADMIN only
router.post('/assign', authenticate, requireAdmin, validateRoleAssignment, checkValidation, roleController.assignRole);

// GET /api/roles/:address — Any authenticated
router.get('/:address', authenticate, roleController.getRole);

export default router;
