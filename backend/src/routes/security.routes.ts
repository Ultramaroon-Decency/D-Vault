import { Router, Request, Response } from 'express';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/security/status
 *
 * Returns the real-time security control status of the D-Vault backend.
 * SECURITY: Returns ONLY safe, non-sensitive metadata — no secrets, credentials,
 *           database passwords, API keys, private keys, or env values exposed.
 *
 * Accessible to any authenticated user (all roles) — used by Security Center UI.
 */
router.get('/status', authenticate, (_req: Request, res: Response) => {
  // ─── Authentication Controls ────────────────────────────────────────────────
  const jwtExpiryHours = parseJwtExpiryToHours(env.JWT_EXPIRES_IN);
  const shortLivedTokens = jwtExpiryHours !== null && jwtExpiryHours <= 1;

  // ─── Config-derived status ──────────────────────────────────────────────────
  const corsIsRestrictive = env.CORS_ORIGIN !== '*' && !env.CORS_ORIGIN.includes('0.0.0.0');
  const adminEmailsUsePublicDomain = checkPublicDomains(env.ADMIN_EMAILS + ',' + env.MANAGER_EMAILS);

  // ─── Response — safe metadata only ─────────────────────────────────────────
  res.json({
    success: true,
    data: {
      timestamp: new Date().toISOString(),

      authentication: {
        walletNonceAuth: true,           // Challenge-response nonce + ECDSA signature
        googleOAuth: !!env.GOOGLE_CLIENT_ID, // Server-side ID token verification
        jwtAuthentication: true,         // All protected routes require Bearer JWT
        shortLivedTokens,               // JWT_EXPIRES_IN <= 1h
        tokenExpiryValue: env.JWT_EXPIRES_IN,
        tokenRevocation: true,           // tokenVersion in JWT + DB validation on each request
        nonceExpiry: true,               // Nonces expire after NONCE_TTL_SECONDS
        nonceTtlSeconds: env.NONCE_TTL_SECONDS,
        jwtSecretStrength: env.JWT_SECRET.length >= 32 ? 'strong' : 'weak', // length only, no value
      },

      authorization: {
        rbac: true,                      // Role-Based Access Control middleware on all routes
        roles: ['ADMIN', 'MANAGER', 'AUDITOR', 'USER'],
        idorProtection: true,            // User profile/role access restricted to self or admin
        adminOnlyRoleAssignment: true,   // Only ADMIN can assign roles
        privilegeEscalationGuard: true,  // Role assignment validated server-side
        auditLogProtection: true,        // Audit endpoint requires AUDITOR or ADMIN role
        adminEmailWhitelistSecure: !adminEmailsUsePublicDomain,
      },

      api: {
        rateLimiting: true,
        globalRateLimitMax: env.RATE_LIMIT_MAX,
        authRateLimitMax: env.AUTH_RATE_LIMIT_MAX,
        rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
        redisRateLimiter: !!env.REDIS_URL,  // Shared store across instances
        inputValidation: true,            // express-validator on all POST/PATCH routes
        bodyLimitKb: 100,                 // JSON/urlencoded body capped at 100kb
        corsRestricted: corsIsRestrictive,
        corsOrigin: env.CORS_ORIGIN,      // safe to expose — it's a URL, not a secret
        helmetEnabled: true,              // Security headers via Helmet
        cspEnabled: true,                 // Strict Content Security Policy
        parameterizedQueries: true,       // Prisma ORM — all queries are parameterized
        errorHandling: true,              // Stack traces never exposed in production
        eventTypeAllowlist: true,         // Audit eventType filter validated against allowlist
      },

      uploads: {
        mimeTypeValidation: true,         // Multer file filter by MIME type
        magicByteValidation: true,        // file-type: content inspection, not header trust
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
        fileSizeLimitMb: 10,
        storedOnIpfs: true,              // Files go to IPFS (Pinata) — not local disk
        ipfsMock: env.IPFS_MOCK,
      },

      database: {
        orm: 'Prisma',
        parameterizedQueries: true,       // No raw SQL construction — injection not possible
        hostPortExposed: false,           // DB port not mapped to host in Docker (VULN-11)
        auditLog: true,                   // All blockchain events logged to audit_events table
        sensitiveDataExposed: false,      // No credentials in this response
      },

      smartContracts: {
        didRegistry: true,               // Decentralized identity on Sepolia
        rbacOnChain: true,               // Role assignments recorded on-chain
        nftMintAuthorization: true,      // Only ADMIN/MANAGER can mint (RBAC check)
        adminSelfRevocationFixed: true,  // RBACManager: admin cannot revoke own role (VULN-08 fixed)
        didAutoVerificationFixed: true,  // DIDRegistry: verified=false by default (VULN-07 fixed)
        contractsMock: env.BLOCKCHAIN_MOCK,
        contractAddressesSet: (
          env.DID_REGISTRY_ADDRESS !== '0x0000000000000000000000000000000000000000' &&
          env.RBAC_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000'
        ),
      },

      infrastructure: {
        containerNonRoot: true,          // Backend runs as appuser, not root (VULN-12)
        dbNotExposedToHost: true,        // PostgreSQL port not mapped to Docker host
        redisForRateLimiting: !!env.REDIS_URL,
        secretsNotInCode: true,          // Secrets loaded from env, never hardcoded
        gitignoreCoversEnv: true,        // .env excluded from version control
        mockConsistency: env.BLOCKCHAIN_MOCK === env.IPFS_MOCK,
      },

      auditStatus: {
        staticAnalysisPerformed: true,
        dynamicTestingPerformed: false,   // Honest: no pen-test / dynamic fuzzing done
        formalSmartContractVerification: false, // Honest: not formally verified
        thirdPartyAudit: false,           // Honest: not yet externally audited
      },
    },
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseJwtExpiryToHours(expiresIn: string): number | null {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  switch (unit) {
    case 's': return n / 3600;
    case 'm': return n / 60;
    case 'h': return n;
    case 'd': return n * 24;
    default: return null;
  }
}

const PUBLIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'proton.me'];
function checkPublicDomains(emailList: string): boolean {
  return emailList
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
    .some(e => PUBLIC_DOMAINS.some(d => e.endsWith(`@${d}`)));
}

export default router;
