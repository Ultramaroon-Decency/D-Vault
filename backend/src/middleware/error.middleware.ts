import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ----- Custom error class -----
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ----- Common pre-built errors -----
export const Errors = {
  unauthorized: (msg = 'Authentication required') =>
    new AppError(msg, 401, 'UNAUTHORIZED'),
  forbidden: (msg = 'Insufficient permissions') =>
    new AppError(msg, 403, 'FORBIDDEN'),
  notFound: (msg = 'Resource not found') =>
    new AppError(msg, 404, 'NOT_FOUND'),
  badRequest: (msg = 'Bad request') =>
    new AppError(msg, 400, 'BAD_REQUEST'),
  conflict: (msg = 'Resource already exists') =>
    new AppError(msg, 409, 'CONFLICT'),
  internal: (msg = 'Internal server error') =>
    new AppError(msg, 500, 'INTERNAL_ERROR', false),
};

// ----- Global error handler middleware -----
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    logger.warn(`[${err.code}] ${err.message}`, {
      path: req.path,
      method: req.method,
      statusCode: err.statusCode,
    });

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // Unexpected / non-operational errors
  logger.error('UNHANDLED_ERROR', {
    message: err.message,
    path: req.path,
    method: req.method,
    // Only log stack in dev
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      // Never expose internal details in production
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    },
  });
};

// ----- 404 handler (must be registered after all routes) -----
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};
