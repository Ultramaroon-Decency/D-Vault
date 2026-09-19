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
    mockPrisma.revokedToken = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
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

    it('should reject a nonce that has already been used (replay attack)', async () => {
      // Prisma's where clause checks `used: false`. If it was used, it returns null.
      mockPrisma.nonce.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/verify')
        .send({
          walletAddress: wallet.address,
          signature: '0x' + '00'.repeat(65),
        });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid or expired login challenge');
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

    it('should authenticate successfully using the dvault_token HttpOnly cookie', async () => {
      mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        walletAddress: wallet.address.toLowerCase(),
        did: null,
        userRoles: [],
      });

      const jwt = require('jsonwebtoken');
      const { env } = require('../src/config/env');
      const token = jwt.sign(
        { userId: 'user-id', walletAddress: wallet.address, role: 'USER', jti: 'cookie-jti' },
        env.JWT_SECRET
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [`dvault_token=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(wallet.address.toLowerCase());
    });
  });

  // =============================================
  // POST /api/auth/logout & Revocation
  // =============================================
  describe('POST /api/auth/logout', () => {
    it('should use the real token exp for revoked token expiresAt', async () => {
      mockPrisma.revokedToken.create.mockResolvedValue({});
      
      const jwt = require('jsonwebtoken');
      const { env } = require('../src/config/env');
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const token = jwt.sign(
        { userId: 'user-id', walletAddress: wallet.address, role: 'USER', jti: 'test-logout-jti', exp },
        env.JWT_SECRET
      );

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.revokedToken.create).toHaveBeenCalledWith({
        data: {
          jti: 'test-logout-jti',
          walletAddress: wallet.address.toLowerCase(),
          expiresAt: new Date(exp * 1000),
        }
      });
    });

    it('should reject a token that has been revoked via logout', async () => {
      // Mock findUnique to return a revoked token for our test jti
      mockPrisma.revokedToken.findUnique.mockResolvedValue({
        id: 'revoked-id',
        jti: 'test-jti',
        walletAddress: wallet.address,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
      });

      // We need a valid token to pass the first verify step
      const jwt = require('jsonwebtoken');
      const { env } = require('../src/config/env');
      const token = jwt.sign(
        { userId: 'user-id', walletAddress: wallet.address, role: 'USER', jti: 'test-jti' },
        env.JWT_SECRET
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe('Token has been revoked');
    });

    it('should allow a fresh login after logout (new jti, not revoked)', async () => {
      // Mock findUnique to return null (token not revoked)
      mockPrisma.revokedToken.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        walletAddress: wallet.address.toLowerCase(),
        did: null,
        userRoles: [],
      });

      const jwt = require('jsonwebtoken');
      const { env } = require('../src/config/env');
      const token = jwt.sign(
        { userId: 'user-id', walletAddress: wallet.address, role: 'USER', jti: 'new-jti' },
        env.JWT_SECRET
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.walletAddress).toBe(wallet.address.toLowerCase());
    });
  });
});
