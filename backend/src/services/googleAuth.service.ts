import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Errors } from '../middleware/error.middleware';
import { AuthenticatedUser } from '../types';
import { RoleName } from '@prisma/client';

// Lazy getter to allow jest.mock('../db/prisma') in tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = () => require('../db/prisma').prisma;

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── SECURITY: Validate Google profile picture URL domain (VULN-24) ───────────
const TRUSTED_PICTURE_HOSTS = [
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
];

function sanitizePictureUrl(picture: string | null | undefined): string | null {
  if (!picture) return null;
  try {
    const url = new URL(picture);
    if (TRUSTED_PICTURE_HOSTS.includes(url.hostname)) return picture;
    return null; // Reject untrusted picture domains
  } catch {
    return null;
  }
}

// ─── Email → Role resolution ──────────────────────────────────────────────────

function parseEmailList(raw: string): string[] {
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function resolveRoleForEmail(email: string): RoleName {
  const adminEmails = parseEmailList(env.ADMIN_EMAILS);
  const managerEmails = parseEmailList(env.MANAGER_EMAILS);
  const lc = email.toLowerCase();
  if (adminEmails.includes(lc)) return 'ADMIN';
  if (managerEmails.includes(lc)) return 'MANAGER';
  return 'USER';
}

// ─── Verify Google ID token (sent from frontend after Google Sign-In) ─────────

export interface GoogleAuthResult {
  token: string;
  expiresIn: string;
  user: {
    email: string;
    name: string | null;
    picture: string | null;
    role: RoleName;
    isNewUser: boolean;
  };
}

/**
 * Verifies a Google ID token from the frontend and returns a platform JWT.
 * SECURITY: tokenVersion included in JWT payload for revocation support. (VULN-03)
 *
 * Flow:
 *   1. Frontend calls Google Sign-In → receives idToken (credential)
 *   2. Frontend POSTs idToken to POST /api/auth/google/verify
 *   3. We verify the token with Google's public keys
 *   4. We upsert the User record (email, googleId, displayName)
 *   5. We auto-assign role from email whitelist on first login
 *   6. We issue our own JWT with tokenVersion
 */
export const verifyGoogleTokenAndLogin = async (idToken: string): Promise<GoogleAuthResult> => {
  // 1. Verify with Google
  let payload: { sub: string; email?: string; name?: string; picture?: string } | undefined;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload() as typeof payload;
  } catch {
    throw Errors.unauthorized('Invalid Google token. Please sign in again.');
  }

  if (!payload?.sub || !payload.email) {
    throw Errors.unauthorized('Google token missing required claims (sub, email).');
  }

  const { sub: googleId, email, name = null, picture: rawPicture = null } = payload;

  // SECURITY: Validate picture URL to trusted Google domains only (VULN-24)
  const picture = sanitizePictureUrl(rawPicture);

  // 2. Check if user already exists (by googleId or email)
  const existing = await db().user.findFirst({
    where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
    include: { userRoles: { include: { role: true } } },
  });

  const isNewUser = !existing;
  const desiredRole = resolveRoleForEmail(email);

  let user: { id: string; email: string | null; displayName: string | null; walletAddress: string | null; did: string | null; tokenVersion: number };

  if (existing) {
    // 3a. Update existing record — SECURITY: increment tokenVersion on login (VULN-03)
    user = await db().user.update({
      where: { id: existing.id },
      data: {
        googleId,
        email: email.toLowerCase(),
        displayName: existing.displayName ?? name,
        authProvider: existing.walletAddress ? 'both' : 'google',
        updatedAt: new Date(),
        tokenVersion: { increment: 1 },
      },
    });
  } else {
    // 3b. Create new user
    user = await db().user.create({
      data: {
        googleId,
        email: email.toLowerCase(),
        displayName: name,
        authProvider: 'google',
      },
    });

    // Auto-assign role on first login based on email whitelist
    const roleRecord = await db().role.findFirst({
      where: { name: desiredRole },
    });
    if (roleRecord) {
      await db().userRole.create({
        data: { userId: user.id, roleId: roleRecord.id },
      });
    }
  }

  // 4. Resolve current role
  const userWithRoles = await db().user.findUnique({
    where: { id: user.id },
    include: { userRoles: { include: { role: true } } },
  });

  const ROLE_PRIORITY: RoleName[] = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'];
  const userRoleNames: RoleName[] = (
    userWithRoles.userRoles as Array<{ role: { name: string } }>
  ).map((ur) => ur.role.name as RoleName);
  const resolvedRole: RoleName =
    ROLE_PRIORITY.find((r) => userRoleNames.includes(r)) ?? 'USER';

  // 5. Issue platform JWT — SECURITY: includes tokenVersion (VULN-03)
  const jwtPayload: AuthenticatedUser = {
    userId: user.id,
    walletAddress: user.walletAddress ?? `google:${googleId}`,
    did: user.did,
    role: resolvedRole,
    email: email.toLowerCase(),
    tokenVersion: user.tokenVersion,
  };

  const token = jwt.sign(jwtPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as import('jsonwebtoken').SignOptions['expiresIn'],
  });

  return {
    token,
    expiresIn: env.JWT_EXPIRES_IN,
    user: {
      email: email.toLowerCase(),
      name,
      picture,
      role: resolvedRole,
      isNewUser,
    },
  };
};
