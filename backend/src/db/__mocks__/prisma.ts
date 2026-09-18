// Auto-mock for ../src/db/prisma
// Jest will use this when jest.mock('../src/db/prisma') is called without a factory

const createMockMethod = () => jest.fn();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any = {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $transaction: jest.fn(async (cb: any) => {
    if (typeof cb === 'function') {
      return cb(prisma);
    }
    return Promise.all(cb);
  }),
  $disconnect: createMockMethod(),
  $connect: createMockMethod(),
};
