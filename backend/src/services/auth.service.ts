import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Errors } from '../middleware/error.middleware';
import { logAuthFailure } from '../utils/logger';
import { AuthenticatedUser, AuthToken, NonceResponse } from '../types';
import { RoleName } from '@prisma/client';

// Lazy getter so jest.mock('../db/prisma') works in tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const db = () => require('../db/prisma').prisma;

const NONCE_TTL_MS = env.NONCE_TTL_SECONDS * 1000;

// =============================================
// Build the sign-in message (SIWE-inspired)
// =============================================
const buildSignMessage = (address: string, nonce: string): string => {
  return [
    'D-Vault Platform wants you to sign in with your Ethereum account:',
    address,
    '',
    'Sign this message to authenticate. This request will not trigger a blockchain transaction or cost any gas fees.',
    '',
    `Nonce: ${nonce}`,
    `Chain ID: ${env.CHAIN_ID}`,
  ].join('\n');
};

// =============================================
// SECURITY: Clean up expired/used nonces (VULN-23)
// Prevents DB accumulation and reduces attack surface
// =============================================
const cleanupExpiredNonces = async (): Promise<void> => {
  try {
    await db().nonce.deleteMany({
      where: {
        OR: [
          { used: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
  } catch {
    // Non-critical — log only, don't fail request
  }
};

// =============================================
// Issue a login nonce
// =============================================
export const issueNonce = async (walletAddress: string): Promise<NonceResponse> => {
  const normalized = walletAddress.toLowerCase();
  const nonce = uuidv4().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

  // Invalidate any existing unused nonces for this wallet (prevent accumulation)
  await db().nonce.updateMany({
    where: { walletAddress: normalized, used: false },
    data: { used: true },
  });

  await db().nonce.create({
    data: { walletAddress: normalized, nonce, expiresAt },
  });

  // SECURITY: Cleanup expired nonces asynchronously (VULN-23)
  cleanupExpiredNonces().catch(() => {});

  const message = buildSignMessage(walletAddress, nonce);

  return {
    nonce,
    message,
    expiresAt: expiresAt.toISOString(),
  };
};

// =============================================
// Verify wallet signature + issue JWT
// =============================================
export const verifySignatureAndLogin = async (
  walletAddress: string,
  signature: string,
): Promise<AuthToken> => {
  const normalized = walletAddress.toLowerCase();

  // 1. Find active nonce
  const nonceRecord = await db().nonce.findFirst({
    where: {
      walletAddress: normalized,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!nonceRecord) {
    logAuthFailure('No valid nonce found', normalized);
    throw Errors.unauthorized('Invalid or expired login challenge. Request a new nonce.');
  }

  // 2. Reconstruct the message that was signed
  const message = buildSignMessage(walletAddress, nonceRecord.nonce);

  // 3. Verify the signature using ethers
  let recoveredAddress: string;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch {
    logAuthFailure('Signature verification threw an error', normalized);
    throw Errors.unauthorized('Invalid signature format');
  }

  if (recoveredAddress.toLowerCase() !== normalized) {
    logAuthFailure('Signature address mismatch', normalized);
    throw Errors.unauthorized('Signature does not match wallet address');
  }

  // 4. Invalidate nonce (one-time use)
  await db().nonce.update({
    where: { id: nonceRecord.id },
    data: { used: true },
  });

  // 5. Upsert user record, SECURITY: increment tokenVersion on each login (VULN-03)
  // This implicitly revokes all previously issued JWTs for this user
  const user = await db().user.upsert({
    where: { walletAddress: normalized },
    update: {
      updatedAt: new Date(),
      tokenVersion: { increment: 1 },
    },
    create: { walletAddress: normalized },
    include: { userRoles: { include: { role: true } } },
  });

  // 6. Resolve role (take highest-privilege role if multiple)
  const ROLE_PRIORITY: RoleName[] = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'];
  const userRoleNames = (user.userRoles as Array<{ role: { name: string } }>).map((ur) => ur.role.name as RoleName);
  const resolvedRole: RoleName =
    ROLE_PRIORITY.find((r) => userRoleNames.includes(r)) ?? 'USER';

  // 7. Issue JWT — SECURITY: includes tokenVersion for revocation checking (VULN-03)
  const payload: AuthenticatedUser = {
    userId: user.id,
    walletAddress: user.walletAddress ?? normalized,
    did: user.did,
    role: resolvedRole,
    tokenVersion: user.tokenVersion,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return { token, expiresIn: env.JWT_EXPIRES_IN };
};

// =============================================
// Logout — invalidate all existing JWTs (VULN-03)
// Incrementing tokenVersion makes all existing tokens stale
// =============================================
export const logoutUser = async (userId: string): Promise<void> => {
  await db().user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
};

// =============================================
// Get current authenticated user profile
// =============================================
export const getMe = async (walletAddress: string): Promise<AuthenticatedUser & { did: string | null }> => {
  const user = await db().user.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
    include: { userRoles: { include: { role: true } } },
  });

  if (!user) throw Errors.notFound('User not found');

  const ROLE_PRIORITY: RoleName[] = ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'];
  const userRoleNames = (user.userRoles as Array<{ role: { name: string } }>).map((ur) => ur.role.name as RoleName);
  const resolvedRole: RoleName =
    ROLE_PRIORITY.find((r) => userRoleNames.includes(r)) ?? 'USER';

  return {
    userId: user.id,
    walletAddress: user.walletAddress ?? walletAddress.toLowerCase(),
    did: user.did,
    role: resolvedRole,
    tokenVersion: user.tokenVersion,
  };
};
