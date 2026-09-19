import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/auth.service';
import { Errors } from '../middleware/error.middleware';
import jwt from 'jsonwebtoken';

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

      // Set HttpOnly cookie for frontend
      const maxAgeMs = 60 * 60 * 1000; // Assumes JWT_EXPIRES_IN is '1h'
      res.cookie('dvault_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAgeMs,
      });

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

// =============================================
// POST /api/auth/logout
// =============================================
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.jti) throw Errors.unauthorized();
    
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.dvault_token) {
      token = req.cookies.dvault_token;
    }

    if (!token) throw Errors.unauthorized();

    const decoded = jwt.decode(token) as jwt.JwtPayload;
    if (!decoded || !decoded.exp) throw Errors.unauthorized();

    const expiresAt = new Date(decoded.exp * 1000);
    
    await authService.revokeToken(req.user.jti, req.user.walletAddress, expiresAt);
    
    // Clear HttpOnly cookie on logout
    res.clearCookie('dvault_token');
    
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    next(err);
  }
};
