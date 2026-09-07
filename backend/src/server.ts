import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/db';
import { startScheduler, stopScheduler } from './jobs/scheduler';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`CloudGuard API listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  startScheduler();
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  stopScheduler();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Do not let a hung connection hold the process open forever.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
