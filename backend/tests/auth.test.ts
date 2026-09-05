import request from 'supertest';
import { ethers } from 'ethers';

// =============================================
// Prisma mock — must use require() inside the
// factory so Jest can hoist jest.mock correctly.
// =============================================
jest.mock('../src/db/prisma');

import app from '../src/app';

// Pull the mocked prisma after mock is set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma: mockPrisma } = require('../src/db/prisma');

// Deterministic test wallet
const wallet = ethers.Wallet.createRandom();

// =============================================
// Auth API Tests
// =============================================
describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================
  // POST /api/auth/nonce
  // =============================================
  describe('POST /api/auth/nonce', () => {
    it('should return a nonce for a valid Ethereum address', async () => {
      mockPrisma.nonce.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.nonce.create.mockImplementation(async ({ data }: any) => ({
        id: 'nonce-id',
        walletAddress: data.walletAddress,
        nonce: data.nonce,
        expiresAt: data.expiresAt,
        used: false,
      }));

      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: wallet.address });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('nonce');
      expect(res.body.data).toHaveProperty('message');
      expect(res.body.data).toHaveProperty('expiresAt');
    });

    it('should reject an invalid Ethereum address', async () => {
      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: 'not-an-address' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject a missing wallet address', async () => {
      const res = await request(app).post('/api/auth/nonce').send({});
      expect(res.status).toBe(400);
    });
  });

  // =============================================
  // POST /api/auth/verify
  // =============================================
  describe('POST /api/auth/verify', () => {
    it('should verify a valid wallet signature and return JWT', async () => {
      // Step 1: Get a real nonce — capture what the service stores
      let capturedNonce = '';
      mockPrisma.nonce.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.nonce.create.mockImplementation(async ({ data }: any) => {
        capturedNonce = data.nonce; // capture the real UUID nonce
        return {
          id: 'nonce-id',
          walletAddress: data.walletAddress,
          nonce: data.nonce,
          expiresAt: data.expiresAt,
          used: false,
        };
      });

      const nonceRes = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: wallet.address });

      expect(nonceRes.status).toBe(200);
      const { message } = nonceRes.body.data;

      // Step 2: Sign the EXACT message returned by the backend
      const signature = await wallet.signMessage(message);

      // Step 3: Setup verify mocks with the captured nonce
      mockPrisma.nonce.findFirst.mockResolvedValue({
        id: 'nonce-id',
        walletAddress: wallet.address.toLowerCase(),
        nonce: capturedNonce,   // SAME nonce that was generated
        expiresAt: new Date(Date.now() + 300000),
        used: false,
      });
      mockPrisma.nonce.update.mockResolvedValue({});
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-id',
        walletAddress: wallet.address.toLowerCase(),
        did: null,
        userRoles: [],
      });

      // Step 4: Verify
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ walletAddress: wallet.address, signature });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('expiresIn');
    });

    it('should reject a tampered/invalid signature', async () => {
      mockPrisma.nonce.findFirst.mockResolvedValue({
        id: 'nonce-id',
        walletAddress: wallet.address.toLowerCase(),
        nonce: 'validnonce123',
        expiresAt: new Date(Date.now() + 300000),
        used: false,
      });

      const res = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: wallet.address,
          signature: '0x' + '00'.repeat(65),
        });

      expect(res.status).toBe(401);
    });

    it('should reject when no valid nonce exists', async () => {
      mockPrisma.nonce.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: wallet.address,
          signature: '0x' + '00'.repeat(65),
        });

      expect(res.status).toBe(401);
    });
  });

  // =============================================
  // GET /api/auth/me
  // =============================================
  describe('GET /api/auth/me', () => {
    it('should return 401 without a JWT', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with a malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });
  });
});
