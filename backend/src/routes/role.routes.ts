import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, isSelf, isAdmin } from '../middleware/auth.middleware';
import { Errors } from '../middleware/error.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { validateRoleAssignment, checkValidation } from '../middleware/validation.middleware';
import * as roleController from '../controllers/role.controller';

const router = Router();

// POST /api/roles/assign — ADMIN only
router.post('/assign', authenticate, requireAdmin, validateRoleAssignment, checkValidation, roleController.assignRole);

// ──────────────────────────────────────────────────────────────────────────────
// SECURITY: Role Enumeration Protection (VULN-05)
// GET /api/roles/:address — self OR admin only
// Without this guard, any user can look up the role of any wallet address,
// enabling reconnaissance of admin/manager accounts.
// ──────────────────────────────────────────────────────────────────────────────
const requireSelfOrAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { address } = req.params;
  if (!isSelf(req, address) && !isAdmin(req)) {
    return next(Errors.forbidden('You can only view your own role. Admin role required to view other users.'));
  }
  return next();
};

router.get('/:address', authenticate, requireSelfOrAdmin, roleController.getRole);

export default router;
