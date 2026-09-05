import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

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
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;
