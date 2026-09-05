import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  clearMocks: true,
  restoreMocks: true,
  setupFiles: ['<rootDir>/tests/setup.ts'],
  // Disable actual DB/blockchain in tests
  testTimeout: 15000,
};

export default config;
