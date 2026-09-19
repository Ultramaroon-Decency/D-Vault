import request from 'supertest';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

jest.mock('../src/db/prisma');

import app from '../src/app';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma: mockPrisma } = require('../src/db/prisma');

describe('Security Fixes Verification Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-16-chars';
  const managerWallet = ethers.Wallet.createRandom();

  const makeToken = (role: string) =>
    jwt.sign(
      {
        userId: 'test-user-id',
        walletAddress: managerWallet.address.toLowerCase(),
        did: 'did:ethr:0x123',
        role,
      },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Fix 1: Nonce Check Atomic Transaction
  // ============================================================================
  describe('Fix 1: Nonce Check & Update Atomic Transaction', () => {
    it('should use db().$transaction to issue nonce atomically', async () => {
      mockPrisma.nonce.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.nonce.create.mockResolvedValue({
        id: 'nonce-1',
        walletAddress: managerWallet.address.toLowerCase(),
        nonce: 'abc123',
        expiresAt: new Date(Date.now() + 300000),
        used: false,
      });

      const res = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: managerWallet.address });

      expect(res.status).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should use db().$transaction to verify signature and invalidate nonce atomically', async () => {
      const nonce = 'randomtestnonce123';
      const message = [
        'SIH Platform wants you to sign in with your Ethereum account:',
        managerWallet.address,
        '',
        'Sign this message to authenticate. This request will not trigger a blockchain transaction or cost any gas fees.',
        '',
        `Nonce: ${nonce}`,
        'Chain ID: 11155111',
      ].join('\n');

      const signature = await managerWallet.signMessage(message);

      mockPrisma.nonce.findFirst.mockResolvedValue({
        id: 'nonce-1',
        walletAddress: managerWallet.address.toLowerCase(),
        nonce,
        expiresAt: new Date(Date.now() + 300000),
        used: false,
      });
      mockPrisma.nonce.update.mockResolvedValue({ id: 'nonce-1', used: true });
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        walletAddress: managerWallet.address.toLowerCase(),
        did: null,
        userRoles: [],
      });

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ walletAddress: managerWallet.address, signature });

      expect(res.status).toBe(200);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.nonce.update).toHaveBeenCalledWith({
        where: { id: 'nonce-1' },
        data: { used: true },
      });
    });
  });

  // ============================================================================
  // Fix 2: JWT Algorithm Pinning
  // ============================================================================
  describe('Fix 2: JWT Algorithm Pinning', () => {
    it('should accept valid HS256 JWT tokens', async () => {
      const validToken = jwt.sign(
        { userId: 'u1', walletAddress: managerWallet.address, did: null, role: 'USER' },
        JWT_SECRET,
        { algorithm: 'HS256' },
      );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        walletAddress: managerWallet.address.toLowerCase(),
        did: null,
        userRoles: [],
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
    });

    it('should reject tokens signed with none or mismatched algorithms', async () => {
      const badToken = jwt.sign(
        { userId: 'u1', walletAddress: managerWallet.address, did: null, role: 'USER' },
        JWT_SECRET,
        { algorithm: 'HS384' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${badToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.message).toContain('Invalid token');
    });
  });

  // ============================================================================
  // Asset Upload Rate Limiting
  // ============================================================================
  describe('Asset Upload Rate Limiting', () => {
    const managerToken = makeToken('MANAGER');

    it('should limit asset uploads and return 429 after exceeding limit', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const limit = 5; // Matches test env setup ASSET_UPLOAD_RATE_LIMIT_MAX

      for (let i = 0; i < limit; i++) {
        const res = await request(app)
          .post('/api/assets/metadata')
          .set('Authorization', `Bearer ${managerToken}`)
          .set('x-test-ip', '1.2.3.4')
          .field('name', `Asset ${i}`)
          .field('description', 'Test desc')
          .field('assetType', 'LAND_TITLE')
          .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });
        
        expect(res.status).toBe(200);
      }

      const rateLimitedRes = await request(app)
        .post('/api/assets/metadata')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('x-test-ip', '1.2.3.4')
        .field('name', 'Too Many Assets')
        .field('description', 'Test desc')
        .field('assetType', 'LAND_TITLE')
        .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });
      
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error.message).toContain('Too many asset uploads');
    });
  });

  // ============================================================================
  // Fix 3: Uploaded File Magic Bytes Validation
  // ============================================================================
  describe('Fix 3: Actual File Content (Magic Bytes) Verification', () => {
    const managerToken = makeToken('MANAGER');

    it('should accept a genuine PNG file matching PNG magic bytes', async () => {
      // PNG header: 89 50 4E 47 0D 0A 1A 0A + dummy bytes
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

      const res = await request(app)
        .post('/api/assets/metadata')
        .set('Authorization', `Bearer ${managerToken}`)
        .field('name', 'Valid Asset')
        .field('description', 'A valid asset with real PNG')
        .field('assetType', 'LAND_TITLE')
        .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('cid');
    });

    it('should reject a spoofed file with fake extension and header but malicious bytes', async () => {
      // An attacker uploads a script or exe pretending to be image/png
      const fakeBuffer = Buffer.from('<?php echo "malicious code"; ?>', 'utf-8');

      const res = await request(app)
        .post('/api/assets/metadata')
        .set('Authorization', `Bearer ${managerToken}`)
        .field('name', 'Malicious Asset')
        .field('description', 'An attacker tries to upload php script')
        .field('assetType', 'LAND_TITLE')
        .attach('file', fakeBuffer, { filename: 'exploit.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Uploaded file content does not match allowed types');
    });

    it('should reject empty files', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const res = await request(app)
        .post('/api/assets/metadata')
        .set('Authorization', `Bearer ${managerToken}`)
        .field('name', 'Empty File Asset')
        .field('description', 'Empty upload')
        .field('assetType', 'LAND_TITLE')
        .attach('file', emptyBuffer, { filename: 'empty.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
