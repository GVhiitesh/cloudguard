import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './config/db';
import { apiRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',') }));
  app.use(express.json({ limit: '5mb' }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  // Attach instance ID header for load balancing verification
  app.use((_req, res, next) => {
    res.setHeader('X-Backend-Instance', process.env.INSTANCE_NAME || 'backend-standalone');
    next();
  });

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        status: 'ok',
        database: 'up',
        instance: process.env.INSTANCE_NAME || 'backend-standalone',
        uptime: process.uptime(),
      });
    } catch {
      res.status(503).json({
        status: 'degraded',
        database: 'down',
        instance: process.env.INSTANCE_NAME || 'backend-standalone',
      });
    }
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
