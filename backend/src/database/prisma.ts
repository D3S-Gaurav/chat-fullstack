import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined;
};

/**
 * Local Postgres instances — the CI service container and `docker compose`
 * — are not built with SSL support, and handing `pg` an `ssl` option makes
 * it attempt a TLS handshake regardless, failing with "The server does not
 * support SSL connections". Hosted databases (Supabase) require TLS, so
 * decide from the connection host rather than from NODE_ENV.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres']);

function isLocalDatabase(connectionString: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(connectionString).hostname);
  } catch {
    // Unparseable connection string — assume remote and keep TLS on.
    return false;
  }
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
    // Only bypass certificate validation in development (for self-signed local certs).
    // In production, always verify TLS certificates to prevent MITM attacks.
    ssl: isLocalDatabase(env.DATABASE_URL)
      ? false
      : { rejectUnauthorized: env.NODE_ENV === 'production' },
  });

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.__prismaClient ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}

/**
 * Gracefully disconnects Prisma.
 * Call this in your server shutdown handler (SIGINT / SIGTERM).
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
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
