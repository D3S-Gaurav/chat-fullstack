import express from 'express';
import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { prisma, disconnectDatabase } from './database/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { globalLimiter } from './middleware/rateLimiter.js';

const app = express();
const server = createServer(app);

app.set('trust proxy', 1);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received — cleaning up');
  server.close(async () => {
    await disconnectDatabase();
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds if graceful fails
  setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `Server running on http://localhost:${String(env.PORT)}`,
  );
});
