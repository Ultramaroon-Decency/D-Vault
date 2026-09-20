import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// =============================================
// SECURITY: Public email domains that should NOT be used as admin whitelists
// =============================================
const PUBLIC_EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'proton.me'];

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  // SECURITY: CORS_ORIGIN must be a valid URL — prevents wildcard or malformed values
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL (e.g. http://localhost:3000)').default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT — SECURITY: Minimum 32 characters of random entropy required (VULN-02)
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters of random entropy. Generate with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'),
  JWT_EXPIRES_IN: z.string().default('1h'),

  // Nonce TTL
  NONCE_TTL_SECONDS: z.string().default('300').transform(Number),

  // Blockchain
  RPC_URL: z.string().default('https://sepolia.infura.io/v3/YOUR_KEY'),
  CHAIN_ID: z.string().default('11155111').transform(Number),
  BLOCKCHAIN_MOCK: z.string().default('true').transform((v) => v === 'true'),

  // Contract Addresses
  DID_REGISTRY_ADDRESS: z.string().default('0x0000000000000000000000000000000000000000'),
  RBAC_CONTRACT_ADDRESS: z.string().default('0x0000000000000000000000000000000000000000'),
  NFT_ASSET_ADDRESS: z.string().default('0x0000000000000000000000000000000000000000'),

  // IPFS / Pinata
  IPFS_MOCK: z.string().default('false').transform((v) => v === 'true'),
  PINATA_JWT: z.string().default(''),
  PINATA_GATEWAY: z.string().default('https://gateway.pinata.cloud/ipfs/'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform(Number),
  RATE_LIMIT_MAX: z.string().default('100').transform(Number),
  AUTH_RATE_LIMIT_MAX: z.string().default('10').transform(Number),

  // Redis (optional — rate limiter falls back to in-memory if not set)
  REDIS_URL: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  FRONTEND_URL: z.string().default('http://localhost:3000'),

  // Email-based role whitelists (comma-separated) — SECURITY: use org-owned domains only (VULN-14)
  ADMIN_EMAILS: z.string().default(''),
  MANAGER_EMAILS: z.string().default(''),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;

// =============================================
// SECURITY: Startup warnings (VULN-14, VULN-25)
// =============================================
const checkPublicDomainInWhitelist = (list: string, label: string) => {
  const emails = list.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const publicOnes = emails.filter(e => PUBLIC_EMAIL_DOMAINS.some(d => e.endsWith(`@${d}`)));
  if (publicOnes.length > 0) {
    console.warn(`⚠️  SECURITY WARNING: ${label} contains public email domain(s): ${publicOnes.join(', ')}`);
    console.warn('   These are not organization-controlled. Use org-owned domains (e.g. @yourcompany.com).');
  }
};

if (env.NODE_ENV === 'production') {
  checkPublicDomainInWhitelist(env.ADMIN_EMAILS, 'ADMIN_EMAILS');
  checkPublicDomainInWhitelist(env.MANAGER_EMAILS, 'MANAGER_EMAILS');
}

if (env.BLOCKCHAIN_MOCK !== env.IPFS_MOCK) {
  console.warn(`⚠️  SECURITY WARNING: BLOCKCHAIN_MOCK=${env.BLOCKCHAIN_MOCK} and IPFS_MOCK=${env.IPFS_MOCK} are inconsistent.`);
  console.warn('   In production, both should be false. In development, both should be true.');
}
