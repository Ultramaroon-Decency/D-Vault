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
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
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

    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};
