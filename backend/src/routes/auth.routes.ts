import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getNonce, verify, getMe, logout } from '../controllers/auth.controller';
import { verifyGoogleToken } from '../controllers/googleAuth.controller';
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

// ── Wallet auth ──────────────────────────────────────────────────────────────
// POST /api/auth/nonce   — Public
router.post('/nonce', authLimiter, ...getNonce);

// POST /api/auth/verify  — Public
router.post('/verify', authLimiter, ...verify);

// ── Google OAuth ─────────────────────────────────────────────────────────────
// POST /api/auth/google/verify  — Public
// Frontend sends the Google ID token; we verify it server-side and return a JWT
router.post('/google/verify', authLimiter, ...verifyGoogleToken);

// ── Profile ──────────────────────────────────────────────────────────────────
// GET /api/auth/me       — Authenticated
router.get('/me', authenticate, getMe);

// ── Logout ───────────────────────────────────────────────────────────────────
// POST /api/auth/logout  — Authenticated
// SECURITY: Increments tokenVersion to revoke all existing JWTs for this user (VULN-03)
router.post('/logout', authenticate, logout);

export default router;
