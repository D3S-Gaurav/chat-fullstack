/**
 * @module database/prisma
 *
 * Singleton Prisma Client instance with PG adapter for Supabase.
 *
 * Why a singleton? In development, module hot-reloading can instantiate
 * multiple PrismaClient instances, exhausting the database connection pool.
 * Storing the instance on `globalThis` prevents this. In production,
 * the module cache already guarantees a single instance, but the guard
 * is kept for safety.
 *
 * Why the PG adapter? Prisma's built-in driver uses its own connection
 * pooling. The `@prisma/adapter-pg` delegates connection management to
 * the `pg` Pool, giving us explicit control over pool size, idle timeout,
 * and SSL configuration — critical for Supabase's connection limits.
 */
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Connection Pool Configuration
const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  throw new Error(
    '[database/prisma] DATABASE_URL is not set. ' +
    'Ensure your .env file exists and is loaded before this module.'
  );
}

/** PostgreSQL connection pool shared with Prisma via the PG adapter. */
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,           // Max simultaneous connections (Supabase free-tier limit is ~15)
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: { rejectUnauthorized: false }, // Required for Supabase hosted Postgres
});

// Log unexpected pool-level errors to prevent silent connection drops.
pool.on('error', (err) => {
  console.error('[database/pool] Unexpected idle-client error:', err.message);
});

// Prisma Client Singleton
/**
 * Extend `globalThis` so TypeScript recognises the cached instance.
 * The symbol is intentionally verbose to avoid collision.
 */
const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined;
};

/**
 * Creates a new PrismaClient wired to the pg Pool via `@prisma/adapter-pg`.
 * Logging is enabled in development for query debugging.
 */
function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(pool);

  const client = new PrismaClient({
    adapter,
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

  return client;
}

/** The singleton PrismaClient instance used across the entire backend. */
export const prisma: PrismaClient =
  globalForPrisma.__prismaClient ?? createPrismaClient();

// Cache the instance in dev to survive module hot-reloads.
if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}

// Lifecycle Helpers
/**
 * Gracefully disconnects Prisma and drains the underlying PG pool.
 * Call this in your server shutdown handler (SIGINT / SIGTERM).
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
  console.info('[database/prisma] Disconnected and pool drained.');
}

/**
 * Lightweight health-check that fires a trivial query.
 * Returns `true` if the database is reachable, `false` otherwise.
 */
export async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
