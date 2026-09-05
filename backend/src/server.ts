import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './db/prisma';
import { startEventListener } from './blockchain/eventListener';

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 SIH Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`   Health: http://localhost:${env.PORT}/health`);
  logger.info(`   Blockchain mock: ${env.BLOCKCHAIN_MOCK}`);
  logger.info(`   IPFS mock: ${env.IPFS_MOCK}`);

  // Start blockchain event listener (non-blocking)
  if (!env.BLOCKCHAIN_MOCK) {
    try {
      await startEventListener();
      logger.info('🔗 Blockchain event listener started');
    } catch (err) {
      logger.error('Failed to start event listener', { error: (err as Error).message });
    }
  } else {
    logger.info('⚠️  Blockchain event listener SKIPPED (BLOCKCHAIN_MOCK=true)');
  }
});

// =============================================
// Graceful shutdown
// =============================================
const shutdown = async (signal: string) => {
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('DB disconnected. Bye!');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message });
  process.exit(1);
});

export default server;
