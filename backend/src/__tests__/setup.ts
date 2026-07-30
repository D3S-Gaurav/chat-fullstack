/**
 * @module __tests__/setup — Global test helpers.
 *
 * Provides `getTestApp()` — a supertest-wrapped Express app
 * that shares the same Prisma client as the production code.
 * Also provides helpers to register users and obtain JWTs.
 *
 * Every test file that imports from here gets:
 *   • A fully-configured Express app (no server.listen, no Socket.IO)
 *   • Direct access to the Prisma client for seed/teardown
 */

import supertest from 'supertest';
import { createApp } from '../app.js';
import { prisma } from '../database/prisma.js';

/**
 * Guard against catastrophic data loss.
 *
 * `cleanDatabase()` below issues `DELETE FROM` against every table. If the
 * suite is ever pointed at a real database — e.g. by loading the app's own
 * `.env`, which targets a hosted Supabase instance — it would irreversibly
 * wipe production data. Refuse to run unless the target is unmistakably a
 * local, throwaway test database.
 */
function assertSafeTestDatabase(): void {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      '[test/setup] DATABASE_URL is not set. It is normally injected by ' +
      'vitest.config.ts — run the suite via `npm test`.',
    );
  }

  const { hostname, pathname } = new URL(url);
  const isLocalHost = ['localhost', '127.0.0.1', '::1', 'postgres'].includes(hostname);
  const isTestDatabase = /test/i.test(pathname);

  if (!isLocalHost || !isTestDatabase) {
    throw new Error(
      '[test/setup] REFUSING TO RUN — the test suite deletes every row in ' +
      'every table.\n' +
      `  host="${hostname}" database="${pathname.replace(/^\//, '')}"\n` +
      '  Required: a localhost host AND a database name containing "test".\n' +
      '  Set TEST_DATABASE_URL to a throwaway database instead.',
    );
  }
}

assertSafeTestDatabase();

export const app = createApp();

/** Supertest agent bound to the test app. */
export function request() {
  return supertest(app);
}

/** Re-export prisma for direct DB operations in tests. */
export { prisma };

/** Counter to generate unique test users. */
let userCounter = 0;

/** Registers a fresh user and returns the JWT + user object. */
export async function registerUser(overrides: {
  username?: string;
  email?: string;
  password?: string;
} = {}) {
  userCounter++;
  const username = overrides.username ?? `testuser_${String(userCounter)}_${Date.now()}`;
  const email = overrides.email ?? `${username}@test.dev`;
  const password = overrides.password ?? 'TestPass1!';

  const res = await request()
    .post('/api/auth/register')
    .send({ username, email, password })
    .expect(201);

  const data = res.body.data as { user: { id: string; email: string; username: string; role: string }; token: string };
  return { user: data.user, token: data.token, password };
}

/**
 * Creates a group with the given user's JWT.
 * Returns the group object.
 */
export async function createGroup(token: string, name?: string) {
  const res = await request()
    .post('/api/groups')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: name ?? `TestGroup_${Date.now()}` })
    .expect(201);

  return res.body.data as { id: string; name: string };
}

/**
 * Truncates all test data in FK-safe order.
 * Called between test files to prevent state leakage.
 */
export async function cleanDatabase() {
  await prisma.$executeRawUnsafe('DELETE FROM "_MessageToTag"');
  await prisma.$executeRawUnsafe('DELETE FROM "Message"');
  await prisma.$executeRawUnsafe('DELETE FROM "GroupMember"');
  await prisma.$executeRawUnsafe('DELETE FROM "Group"');
  await prisma.$executeRawUnsafe('DELETE FROM "Tag"');
  await prisma.$executeRawUnsafe('DELETE FROM "User"');
}
