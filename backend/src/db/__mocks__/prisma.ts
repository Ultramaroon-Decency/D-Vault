// Auto-mock for ../src/db/prisma
// Jest will use this when jest.mock('../src/db/prisma') is called without a factory

const createMockMethod = () => jest.fn();

export const prisma = {
  nonce: {
    findFirst: createMockMethod(),
    create: createMockMethod(),
    update: createMockMethod(),
    updateMany: createMockMethod(),
    deleteMany: createMockMethod(),
  },
  user: {
    upsert: createMockMethod(),
    findUnique: createMockMethod(),
    update: createMockMethod(),
  },
  role: {
    findUnique: createMockMethod(),
    findMany: createMockMethod(),
  },
  userRole: {
    upsert: createMockMethod(),
    create: createMockMethod(),
    deleteMany: createMockMethod(),
  },
  asset: {
    findMany: createMockMethod(),
    findUnique: createMockMethod(),
    count: createMockMethod(),
    create: createMockMethod(),
    upsert: createMockMethod(),
    updateMany: createMockMethod(),
  },
  auditEvent: {
    findMany: createMockMethod(),
    findUnique: createMockMethod(),
    create: createMockMethod(),
    count: createMockMethod(),
  },
  transaction: {
    upsert: createMockMethod(),
    create: createMockMethod(),
  },
  indexerState: {
    upsert: createMockMethod(),
    findUnique: createMockMethod(),
    update: createMockMethod(),
  },
  $disconnect: createMockMethod(),
  $connect: createMockMethod(),
};
