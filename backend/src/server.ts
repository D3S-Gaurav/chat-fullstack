/**
 * @module server — Application entry point.
 *
 * Creates the HTTP server, initializes Socket.IO, and starts listening.
 * Graceful shutdown is handled here. The Express app itself is built
 * by `createApp()` in `app.ts` so it can be imported independently by tests.
 */

import { createServer } from 'node:http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { disconnectDatabase } from './database/prisma.js';
import { initializeSocket } from './socket/index.js';
import { createApp } from './app.js';

const app = createApp();
const server = createServer(app);

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

initializeSocket(server);

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `Server running on http://localhost:${String(env.PORT)}`,
  );
});
