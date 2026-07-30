/**
 * @module app — Express application factory.
 *
 * Exports `createApp()` which builds the fully-configured Express app
 * with all middleware, routes, and error handling. Separated from
 * `server.ts` so tests can import the app without binding a port
 * or initializing Socket.IO.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { authRouter } from './routes/auth.routes.js';
import { roomRouter } from './routes/room.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { userRouter } from './routes/user.routes.js';

/** Creates and configures the Express application. */
export function createApp(): express.Express {
  const app = express();

  // Only trust proxy headers in production (behind a reverse proxy like nginx/cloudflare)
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', env.TRUST_PROXY);
  }
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use(globalLimiter);

  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/groups', roomRouter);
  app.use('/api/messages', chatRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
