import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getNonce, verify, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { env } from '../config/env';

const router = Router();

// Stricter rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many auth attempts. Try again later.' },
  },
});

// POST /api/auth/nonce   — Public
router.post('/nonce', authLimiter, ...getNonce);

// POST /api/auth/verify  — Public
router.post('/verify', authLimiter, ...verify);

// GET /api/auth/me       — Authenticated
router.get('/me', authenticate, getMe);

export default router;
