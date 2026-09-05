import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { RoleName } from '@prisma/client';

// Mock Prisma to avoid real DB
jest.mock('../src/db/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    role: { findUnique: jest.fn() },
    userRole: { upsert: jest.fn(), deleteMany: jest.fn() },
  },
}));

const JWT_SECRET = 'test-jwt-secret-minimum-16-chars';

const makeToken = (role: RoleName, walletAddress = '0x1234567890abcdef1234567890abcdef12345678') =>
  jwt.sign(
    { userId: 'user-id', walletAddress, did: null, role },
    JWT_SECRET,
    { expiresIn: '1h' },
  );

describe('RBAC Middleware', () => {
  // =============================================
  // Unauthenticated access
  // =============================================
  it('should return 401 for unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(401);
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/api/roles/assign');
    expect(res.status).toBe(401);
  });

  // =============================================
  // Role-based access — 403 cases
  // =============================================
  it('should return 403 when USER tries to access ADMIN-only route', async () => {
    const token = makeToken('USER');
    const res = await request(app)
      .post('/api/roles/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: '0x1111111111111111111111111111111111111111', role: 'MANAGER' });

    expect(res.status).toBe(403);
  });

  it('should return 403 when USER tries to access AUDITOR route', async () => {
    const token = makeToken('USER');
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('should return 403 when AUDITOR tries to access MANAGER route (metadata upload)', async () => {
    const token = makeToken('AUDITOR');
    const res = await request(app)
      .post('/api/assets/metadata')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Test Asset')
      .field('description', 'A test asset')
      .field('assetType', 'document');

    expect(res.status).toBe(403);
  });

  // =============================================
  // Role-based access — 200/pass cases
  // =============================================
  it('should allow ADMIN to access ADMIN-only roles/assign route (validation error expected, not 403)', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/roles/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: 'invalid', role: 'MANAGER' });

    // Should get 400 (validation) not 403 (authorization)
    expect(res.status).toBe(400);
    expect(res.body.error?.code).not.toBe('FORBIDDEN');
  });

  it('should allow ADMIN to access AUDITOR route', async () => {
    const token = makeToken('ADMIN');
    // Will fail at DB level (mock returns undefined) but not at auth/rbac level
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`);

    // 200 or 500 (DB error) — not 401 or 403
    expect([200, 500]).toContain(res.status);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  // =============================================
  // Expired token
  // =============================================
  it('should return 401 for an expired JWT', async () => {
    const expiredToken = jwt.sign(
      { userId: 'user-id', walletAddress: '0x1234567890abcdef1234567890abcdef12345678', did: null, role: 'ADMIN' },
      JWT_SECRET,
      { expiresIn: -1 }, // already expired
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain('expired');
  });
});
