import { Request, Response, NextFunction } from 'express';
import { verifyGoogleTokenAndLogin } from '../services/googleAuth.service';
import { body, validationResult } from 'express-validator';

/**
 * POST /api/auth/google/verify
 * Body: { idToken: string }
 *
 * Called by the frontend after Google Sign-In succeeds.
 * We verify the ID token server-side (never trust client-only).
 */
export const verifyGoogleToken = [
  body('idToken').isString().notEmpty().withMessage('idToken is required'),

  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    try {
      const { idToken } = req.body as { idToken: string };
      const result = await verifyGoogleTokenAndLogin(idToken);

      // Set HttpOnly cookie for frontend
      const maxAgeMs = 60 * 60 * 1000; // Assumes JWT_EXPIRES_IN is '1h'
      res.cookie('dvault_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: maxAgeMs,
      });

      res.json({
        success: true,
        token: result.token,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  },
];
