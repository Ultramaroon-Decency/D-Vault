import { Request, Response, NextFunction } from 'express';
import { RoleName } from '@prisma/client';
import { Errors } from './error.middleware';
import { logAuthorizationFailure } from '../utils/logger';

/**
 * requireRole(...roles)
 * Must be used AFTER authenticate middleware.
 * Returns 403 if the authenticated user's role is not in the allowed list.
 *
 * Usage:
 *   router.post('/assign', authenticate, requireRole('ADMIN'), controller)
 *   router.get('/data',    authenticate, requireRole('AUDITOR', 'ADMIN'), controller)
 */
export const requireRole = (...allowedRoles: RoleName[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw Errors.unauthorized('Authentication required');
      }

      if (!allowedRoles.includes(req.user.role)) {
        logAuthorizationFailure(
          `Role ${req.user.role} is not in [${allowedRoles.join(', ')}]`,
          req.user.walletAddress,
          req.user.role,
        );
        throw Errors.forbidden(
          `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};

// =============================================
// Convenience role guards (named exports)
// =============================================
export const requireAdmin = requireRole('ADMIN');
export const requireManager = requireRole('MANAGER', 'ADMIN');
export const requireAuditor = requireRole('AUDITOR', 'ADMIN');
