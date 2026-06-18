/**
 * @module database/prisma
 */

import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  throw new Error(
    '[database/prisma] DATABASE_URL is not set. ' +
    'Ensure your .env file exists and is loaded before this module.'
  );
}

const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase hosted Postgres
  });

  return new PrismaClient({
    adapter,
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.__prismaClient ?? createPrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}

/**
 * Gracefully disconnects Prisma.
 * Call this in your server shutdown handler (SIGINT / SIGTERM).
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.info('[database/prisma] Disconnected.');
}

/**
 * Lightweight health-check via Prisma's own connection.
 * Returns `true` if the database is reachable, `false` otherwise.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
