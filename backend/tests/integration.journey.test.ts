import request from 'supertest';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

// =============================================
// Prisma mock — must use require() inside the
// factory so Jest can hoist jest.mock correctly.
// =============================================
jest.mock('../src/db/prisma');

import app from '../src/app';

// Pull the mocked prisma after mock is set up
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma: mockPrisma } = require('../src/db/prisma');

describe('End-to-End Verification Journey', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-16-chars';

  // Wallets representing the distinct actors in the SIH workflow
  const adminWallet = ethers.Wallet.createRandom();
  const managerWallet = ethers.Wallet.createRandom();
  const userWallet = ethers.Wallet.createRandom();
  const auditorWallet = ethers.Wallet.createRandom();

  let adminToken: string;
  let managerToken: string;
  let auditorToken: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.revokedToken = {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    };
  });

  // =========================================================================
  // Stage 1: Admin assigns Manager role
  // =========================================================================
  describe('Admin assigns Manager role', () => {
    it('should authenticate Admin via SIWE flow and assign MANAGER role to target wallet', async () => {
      // Step 1.1: Request nonce for Admin
      let capturedNonce = '';
      mockPrisma.nonce.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.nonce.create.mockImplementation(async ({ data }: { data: { walletAddress: string; nonce: string; expiresAt: Date } }) => {
        capturedNonce = data.nonce;
        return {
          id: 'admin-nonce-id',
          walletAddress: data.walletAddress,
          nonce: data.nonce,
          expiresAt: data.expiresAt,
          used: false,
        };
      });

      const nonceRes = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: adminWallet.address });

      expect(nonceRes.status).toBe(200);
      expect(nonceRes.body.success).toBe(true);
      expect(nonceRes.body.data).toHaveProperty('nonce');
      const { message } = nonceRes.body.data;

      // Step 1.2: Sign message with Admin wallet
      const signature = await adminWallet.signMessage(message);

      // Step 1.3: Verify signature and issue Admin JWT
      mockPrisma.nonce.findFirst.mockResolvedValue({
        id: 'admin-nonce-id',
        walletAddress: adminWallet.address.toLowerCase(),
        nonce: capturedNonce,
        expiresAt: new Date(Date.now() + 300000),
        used: false,
      });
      mockPrisma.nonce.update.mockResolvedValue({});
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'admin-user-id',
        walletAddress: adminWallet.address.toLowerCase(),
        did: `did:ethr:sepolia:${adminWallet.address.toLowerCase()}`,
        userRoles: [
          {
            role: { name: 'ADMIN' },
          },
        ],
      });

      const verifyRes = await request(app)
        .post('/api/auth/verify')
        .send({ walletAddress: adminWallet.address, signature });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data).toHaveProperty('token');
      adminToken = verifyRes.body.data.token;

      // Step 1.4: Admin assigns MANAGER role to managerWallet
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'manager-user-id',
        walletAddress: managerWallet.address.toLowerCase(),
      });
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-manager-id',
        name: 'MANAGER',
      });
      mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.userRole.create.mockResolvedValue({
        id: 'user-role-id',
        userId: 'manager-user-id',
        roleId: 'role-manager-id',
        assignedBy: adminWallet.address.toLowerCase(),
      });

      const assignRes = await request(app)
        .post('/api/roles/assign')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          walletAddress: managerWallet.address,
          role: 'MANAGER',
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.success).toBe(true);
      expect(assignRes.body.data.walletAddress).toBe(managerWallet.address.toLowerCase());
      expect(assignRes.body.data.role).toBe('MANAGER');
      expect(assignRes.body.data.assignedBy).toBe(adminWallet.address.toLowerCase());
    });
  });

  // =========================================================================
  // Stage 2: Manager prepares NFT metadata for User
  // =========================================================================
  describe('Manager prepares NFT metadata for User', () => {
    it('should authenticate Manager and prepare IPFS NFT metadata linked to User DID', async () => {
      // Step 2.1: Authenticate as the newly-assigned MANAGER
      // Mock Manager user role resolution via SIWE flow
      let capturedManagerNonce = '';
      mockPrisma.nonce.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.nonce.create.mockImplementation(async ({ data }: { data: { walletAddress: string; nonce: string; expiresAt: Date } }) => {
        capturedManagerNonce = data.nonce;
        return {
          id: 'manager-nonce-id',
          walletAddress: data.walletAddress,
          nonce: data.nonce,
          expiresAt: data.expiresAt,
          used: false,
        };
      });

      const nonceRes = await request(app)
        .post('/api/auth/nonce')
        .send({ walletAddress: managerWallet.address });

      expect(nonceRes.status).toBe(200);
      const { message } = nonceRes.body.data;
      const signature = await managerWallet.signMessage(message);

      mockPrisma.nonce.findFirst.mockResolvedValue({
        id: 'manager-nonce-id',
        walletAddress: managerWallet.address.toLowerCase(),
        nonce: capturedManagerNonce,
        expiresAt: new Date(Date.now() + 300000),
        used: false,
      });
      mockPrisma.nonce.update.mockResolvedValue({});
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'manager-user-id',
        walletAddress: managerWallet.address.toLowerCase(),
        did: `did:ethr:sepolia:${managerWallet.address.toLowerCase()}`,
        userRoles: [
          {
            role: { name: 'MANAGER' },
          },
        ],
      });

      const verifyRes = await request(app)
        .post('/api/auth/verify')
        .send({ walletAddress: managerWallet.address, signature });

      expect(verifyRes.status).toBe(200);
      managerToken = verifyRes.body.data.token;

      // Step 2.2: Manager calls POST /api/assets/metadata for the User's DID
      const userDID = `did:ethr:sepolia:${userWallet.address.toLowerCase()}`;
      const metadataPayload = {
        name: 'Land Registry Certificate #8891',
        description: 'Verified digital ownership certificate issued via D-Vault',
        assetType: 'LAND_TITLE',
        ownerDID: userDID,
      };

      const assetRes = await request(app)
        .post('/api/assets/metadata')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(metadataPayload);

      expect(assetRes.status).toBe(200);
      expect(assetRes.body.success).toBe(true);
      expect(assetRes.body.data).toHaveProperty('cid');
      expect(assetRes.body.data).toHaveProperty('ipfsUri');
      expect(assetRes.body.data.cid).toMatch(/^bafybeimock/);
      expect(assetRes.body.data.ipfsUri).toBe(`ipfs://${assetRes.body.data.cid}`);
      expect(assetRes.body.data.metadata.name).toBe(metadataPayload.name);
      expect(assetRes.body.data.metadata.ownerDID).toBe(userDID);
    });
  });

  // =========================================================================
  // Stage 3: Auditor can view the audit trail
  // =========================================================================
  describe('Auditor can view the audit trail', () => {
    it('should allow Auditor to read the audit log records successfully', async () => {
      // Create an AUDITOR JWT directly or via auth flow
      auditorToken = jwt.sign(
        {
          userId: 'auditor-user-id',
          walletAddress: auditorWallet.address.toLowerCase(),
          did: `did:ethr:sepolia:${auditorWallet.address.toLowerCase()}`,
          role: 'AUDITOR',
        },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      // NOTE: Full on-chain audit trail verification requires the real Hardhat/Sepolia
      // integration (Phase 11) where contract events trigger the background indexer.
      // In BLOCKCHAIN_MOCK mode, this integration test verifies that the Audit Read API
      // correctly authenticates, enforces RBAC, queries Prisma, and returns the audit trail.
      const syntheticAuditRecord = {
        id: 'audit-record-1',
        eventType: 'ROLE_ASSIGNED',
        actorAddress: adminWallet.address.toLowerCase(),
        tokenId: null,
        txHash: '0xmockedtxhash1234567890abcdef1234567890abcdef1234567890abcdef12345678',
        blockNumber: 12345678n,
        timestamp: new Date(),
        dataJson: JSON.stringify({
          target: managerWallet.address.toLowerCase(),
          role: 'MANAGER',
          assignedBy: adminWallet.address.toLowerCase(),
        }),
        createdAt: new Date(),
      };

      mockPrisma.auditEvent.findMany.mockResolvedValue([syntheticAuditRecord]);
      mockPrisma.auditEvent.count.mockResolvedValue(1);

      const auditRes = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${auditorToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.success).toBe(true);
      expect(Array.isArray(auditRes.body.data)).toBe(true);
      expect(auditRes.body.data.length).toBe(1);
      expect(auditRes.body.data[0].eventType).toBe('ROLE_ASSIGNED');
      expect(auditRes.body.data[0].actorAddress).toBe(adminWallet.address.toLowerCase());
      expect(auditRes.body.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
      });
    });
  });
});
