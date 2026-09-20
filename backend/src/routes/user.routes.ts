import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, isSelf, isAdmin } from '../middleware/auth.middleware';
import { Errors } from '../middleware/error.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// ──────────────────────────────────────────────────────────────────────────────
// SECURITY: IDOR Protection (VULN-04)
// GET /api/users/:address — self OR admin only
// Without this guard, any authenticated user could read any user's profile,
// exposing email, DID, display name, and auth provider.
// ──────────────────────────────────────────────────────────────────────────────
const requireSelfOrAdmin = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const { address } = req.params;
  if (!isSelf(req, address) && !isAdmin(req)) {
    return next(Errors.forbidden('You can only access your own profile. Admin role required for other users.'));
  }
  return next();
};

router.get('/:address', authenticate, requireSelfOrAdmin, userController.getUser);
router.get('/:address/did', authenticate, requireSelfOrAdmin, userController.getUserDID);

export default router;
