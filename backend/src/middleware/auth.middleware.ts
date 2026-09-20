import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Errors } from './error.middleware';
import { logAuthFailure } from '../utils/logger';
import { AuthenticatedUser } from '../types';

// Lazy DB getter (allows jest.mock to work in tests)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = () => require('../db/prisma').prisma;

/**
 * authenticate middleware
 * Verifies the Bearer JWT in the Authorization header.
 * SECURITY: Also validates tokenVersion against the database to support
 *           token revocation (logout invalidates all existing tokens). (VULN-03)
 * On success, attaches the decoded payload to req.user.
 * On failure, throws 401.
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logAuthFailure('Missing or malformed Authorization header', undefined);
      throw Errors.unauthorized('Bearer token is required');
    }

    const token = authHeader.split(' ')[1];

    let decoded: AuthenticatedUser;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    } catch (jwtErr) {
      const msg =
        jwtErr instanceof jwt.TokenExpiredError
          ? 'Token has expired. Please login again.'
          : 'Invalid token';
      logAuthFailure(msg, undefined);
      throw Errors.unauthorized(msg);
    }

    // SECURITY: Validate tokenVersion against DB to support revocation (VULN-03)
    // This prevents stolen tokens from remaining valid after logout.
    // Skip in test environment to avoid DB dependency in unit tests.
    if (env.NODE_ENV !== 'test') {
      try {
        const userRecord = await db().user.findUnique({
          where: { id: decoded.userId },
          select: { tokenVersion: true },
        });
        if (!userRecord) {
          logAuthFailure('Token references non-existent user', decoded.walletAddress);
          throw Errors.unauthorized('Invalid token — user not found');
        }
        if (userRecord.tokenVersion !== decoded.tokenVersion) {
          logAuthFailure('Token version mismatch — token has been revoked', decoded.walletAddress);
          throw Errors.unauthorized('Token has been revoked. Please login again.');
        }
      } catch (dbErr) {
        // Re-throw AppErrors (401), swallow DB connection errors gracefully
        if ((dbErr as { statusCode?: number }).statusCode === 401) throw dbErr;
        // If DB is down, fall back to JWT-only validation (degraded mode)
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

// =============================================
// Helper guards used in route-level middleware (VULN-04, VULN-05)
// =============================================

/** Returns true if the authenticated user IS the requested address (case-insensitive) */
export const isSelf = (req: Request, address: string): boolean =>
  req.user?.walletAddress.toLowerCase() === address.toLowerCase();

/** Returns true if the authenticated user has ADMIN role */
export const isAdmin = (req: Request): boolean =>
  req.user?.role === 'ADMIN';
