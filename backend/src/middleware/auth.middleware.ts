import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Errors } from './error.middleware';
import { logAuthFailure } from '../utils/logger';
import { AuthenticatedUser } from '../types';

/**
 * authenticate middleware
 * Verifies the Bearer JWT in the Authorization header.
 * On success, attaches the decoded payload to req.user.
 * On failure, throws 401.
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.dvault_token) {
      token = req.cookies.dvault_token;
    }

    if (!token) {
      logAuthFailure('Missing or malformed Authorization header and no cookie', undefined);
      throw Errors.unauthorized('Bearer token is required');
    }

    let decoded: AuthenticatedUser;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
      }) as AuthenticatedUser;
    } catch (jwtErr) {
      const msg =
        jwtErr instanceof jwt.TokenExpiredError
          ? 'Token has expired. Please login again.'
          : 'Invalid token';
      logAuthFailure(msg, undefined);
      throw Errors.unauthorized(msg);
    }

    if (decoded.jti) {
      // Lazy getter to allow jest.mock('../db/prisma') in tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const db = () => require('../db/prisma').prisma;
      
      const revoked = await db().revokedToken.findUnique({
        where: { jti: decoded.jti },
      });

      if (revoked) {
        logAuthFailure('Token has been revoked', decoded.walletAddress);
        throw Errors.unauthorized('Token has been revoked');
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};
