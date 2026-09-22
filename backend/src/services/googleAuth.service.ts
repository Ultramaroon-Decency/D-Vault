import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Errors } from '../middleware/error.middleware';
import { AuthenticatedUser, AuthToken } from '../types';
import { RoleName } from '@prisma/client';

// Lazy getter to allow jest.mock('../db/prisma') in tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = () => require('../db/prisma').prisma;

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── Email → Role resolution ──────────────────────────────────────────────────

function parseEmailList(raw: string): string[] {
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function resolveRoleForEmail(email: string): RoleName {
  const primaryAdmin = env.PRIMARY_ADMIN_EMAIL ? env.PRIMARY_ADMIN_EMAIL.trim().toLowerCase() : '';
  const adminEmails = parseEmailList(env.ADMIN_EMAILS);
  const managerEmails = parseEmailList(env.MANAGER_EMAILS);
  const lc = email.toLowerCase();

  // Primary Admin email configured in backend takes absolute precedence
  if (primaryAdmin && lc === primaryAdmin) return 'ADMIN';
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
 *
 * Flow:
 *   1. Frontend calls Google Sign-In → receives idToken (credential)
 *   2. Frontend POSTs idToken to POST /api/auth/google/verify
 *   3. We verify the token with Google's public keys
 *   4. Check identity against PRIMARY_ADMIN_EMAIL & role whitelists
 *   5. We upsert the User record (email, googleId, displayName)
 *   6. We enforce role from verified identity & DB roles
 *   7. We issue our own JWT with the trusted role
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
    // If running in development with demo token or Google Client ID empty/demo
    if (env.NODE_ENV === 'development' && (idToken.startsWith('mock_') || !env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID === 'demo-google-client-id')) {
      try {
        const decoded = jwt.decode(idToken) as { sub?: string; email?: string; name?: string; picture?: string };
        if (decoded?.sub && decoded?.email) {
          payload = {
            sub: decoded.sub,
            email: decoded.email,
            name: decoded.name,
            picture: decoded.picture,
          };
        }
      } catch {
        // continue to error below
      }
    }
    if (!payload) {
      throw Errors.unauthorized('Invalid Google token. Please sign in again.');
    }
  }

  if (!payload?.sub || !payload.email) {
    throw Errors.unauthorized('Google token missing required claims (sub, email).');
  }

  const { sub: googleId, email, name = null, picture = null } = payload;
  const desiredRole = resolveRoleForEmail(email);

  try {
    // 2. Check if user already exists (by googleId or email)
    const existing = await db().user.findFirst({
      where: { OR: [{ googleId }, { email: email.toLowerCase() }] },
      include: { userRoles: { include: { role: true } } },
    });

    const isNewUser = !existing;
    let user: { id: string; email: string | null; displayName: string | null; walletAddress: string | null; did: string | null };

    if (existing) {
      // 3a. Update existing record (keep wallet address if present)
      user = await db().user.update({
        where: { id: existing.id },
        data: {
          googleId,
          email: email.toLowerCase(),
          displayName: existing.displayName ?? name,
          authProvider: existing.walletAddress ? 'both' : 'google',
          updatedAt: new Date(),
        },
      });

      // If email is configured as primary admin or in admin/manager whitelist, ensure that role exists
      if (desiredRole !== 'USER') {
        const hasDesiredRole = existing.userRoles?.some((ur: { role: { name: string } }) => ur.role.name === desiredRole);
        if (!hasDesiredRole) {
          const roleRecord = await db().role.findFirst({ where: { name: desiredRole } });
          if (roleRecord) {
            await db().userRole.create({
              data: { userId: user.id, roleId: roleRecord.id },
            });
          }
        }
      }
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

      // Auto-assign role on first login based on email check (Primary Admin -> ADMIN, etc.)
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
      userWithRoles?.userRoles as Array<{ role: { name: string } }> | undefined
    )?.map((ur) => ur.role.name as RoleName) ?? [];
    
    // Primary Admin always has ADMIN role; otherwise resolve from registered roles or fallback to desiredRole
    let resolvedRole: RoleName;
    if (desiredRole === 'ADMIN') {
      resolvedRole = 'ADMIN';
    } else {
      resolvedRole = ROLE_PRIORITY.find((r) => userRoleNames.includes(r)) ?? desiredRole;
    }

    // 5. Issue platform JWT
    const jwtPayload: AuthenticatedUser = {
      userId: user.id,
      walletAddress: user.walletAddress ?? `google:${googleId}`,
      did: user.did,
      role: resolvedRole,
      email: email.toLowerCase(),
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
  } catch (dbErr) {
    // If DB is offline (e.g. Postgres not running locally), securely resolve role based on verified email identity
    const resolvedRole: RoleName = desiredRole;
    const jwtPayload: AuthenticatedUser = {
      userId: `google:${googleId}`,
      walletAddress: `google:${googleId}`,
      did: `did:ethr:google:${googleId}`,
      role: resolvedRole,
      email: email.toLowerCase(),
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
        isNewUser: false,
      },
    };
  }
};
