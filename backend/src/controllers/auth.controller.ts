import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/auth.service';
import { Errors } from '../middleware/error.middleware';

// =============================================
// POST /api/auth/nonce
// =============================================
export const getNonce = [
  body('walletAddress')
    .isEthereumAddress()
    .withMessage('walletAddress must be a valid Ethereum address'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw Errors.badRequest(errors.array()[0].msg);
      }

      const { walletAddress } = req.body;
      const result = await authService.issueNonce(walletAddress);

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
];

// =============================================
// POST /api/auth/verify
// =============================================
export const verify = [
  body('walletAddress')
    .isEthereumAddress()
    .withMessage('walletAddress must be a valid Ethereum address'),
  body('signature')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('signature is required'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw Errors.badRequest(errors.array()[0].msg);
      }

      const { walletAddress, signature } = req.body;
      const result = await authService.verifySignatureAndLogin(walletAddress, signature);

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
];

// =============================================
// GET /api/auth/me
// =============================================
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw Errors.unauthorized();
    const profile = await authService.getMe(req.user.walletAddress);
    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
};
