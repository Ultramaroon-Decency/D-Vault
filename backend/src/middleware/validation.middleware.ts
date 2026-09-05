import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Errors } from './error.middleware';

/**
 * Reusable helper: throws a 400 AppError if express-validator found errors.
 */
export const validate = (req: Request): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw Errors.badRequest(errors.array()[0].msg);
  }
};

/**
 * Middleware factory wrapping validate() for use in route chains.
 */
export const checkValidation = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    validate(req);
    next();
  } catch (err) {
    next(err);
  }
};

// =============================================
// Common validator chains
// =============================================

export const validateEthAddress = (field: string) =>
  body(field).isEthereumAddress().withMessage(`${field} must be a valid Ethereum address`);

export const validateTokenId = () =>
  param('tokenId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('tokenId is required');

export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('limit must be 1-100'),
];

export const validateAssetMetadata = [
  body('name').isString().trim().notEmpty().isLength({ max: 200 }).withMessage('name is required (max 200 chars)'),
  body('description').isString().trim().notEmpty().isLength({ max: 2000 }).withMessage('description is required (max 2000 chars)'),
  body('assetType').isString().trim().notEmpty().isLength({ max: 100 }).withMessage('assetType is required'),
  body('ownerDID').optional().isString().trim().isLength({ max: 500 }).withMessage('ownerDID must be a string'),
];

export const validateRoleAssignment = [
  validateEthAddress('walletAddress'),
  body('role')
    .isIn(['ADMIN', 'MANAGER', 'AUDITOR', 'USER'])
    .withMessage('role must be one of: ADMIN, MANAGER, AUDITOR, USER'),
];
