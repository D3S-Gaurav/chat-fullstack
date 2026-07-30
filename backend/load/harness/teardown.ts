/**
 * @module load/harness/teardown — Truncates all load test data.
 *
 * Deletes all seeded rows in FK-safe order using the Prisma client.
 * Must be run against the same database the tests used.
 *
 * Usage: npx tsx load/harness/teardown.ts
 */

import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('[teardown] DATABASE_URL is not set');
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('[teardown] Truncating load test data...');

  // Delete in FK-safe order
  await prisma.$executeRawUnsafe('DELETE FROM "_MessageToTag"');
  console.log('  _MessageToTag cleared');

  await prisma.$executeRawUnsafe('DELETE FROM "Message"');
  console.log('  Message cleared');

  await prisma.$executeRawUnsafe('DELETE FROM "GroupMember"');
  console.log('  GroupMember cleared');

  await prisma.$executeRawUnsafe('DELETE FROM "Group"');
  console.log('  Group cleared');

  await prisma.$executeRawUnsafe('DELETE FROM "Tag"');
  console.log('  Tag cleared');

  await prisma.$executeRawUnsafe('DELETE FROM "User"');
  console.log('  User cleared');

  await prisma.$disconnect();
  console.log('[teardown] Done.');
}

main().catch((err: unknown) => {
  console.error('[teardown] Fatal:', err);
  process.exit(1);
});
