/**
 * @module scripts/seed-demo — Seeds a demo account for recruiter access.
 *
 * Creates demo@chatflow.dev with a public password and a welcome
 * group with sample messages. Idempotent — skips if user exists.
 *
 * Usage: npx tsx scripts/seed-demo.ts
 * Requires: DATABASE_URL in .env
 */

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('[seed] DATABASE_URL is not set');
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = 'demo@chatflow.dev';
const DEMO_PASSWORD = 'ChatFlowDemo!2026';
const DEMO_USERNAME = 'demo';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function main(): Promise<void> {
  console.log('[seed] Seeding demo account...');

  // Check if demo user already exists
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log('[seed] Demo user already exists — skipping.');
    await prisma.$disconnect();
    return;
  }

  // Create demo user
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const demoUser = await prisma.user.create({
    data: {
      username: DEMO_USERNAME,
      email: DEMO_EMAIL,
      passwordHash,
    },
  });
  console.log(`[seed] Created user: ${DEMO_EMAIL}`);

  // Create a welcome group
  const group = await prisma.group.create({
    data: {
      name: 'Welcome',
      description: 'A demo group to explore ChatFlow. Feel free to send messages!',
      members: {
        create: { userId: demoUser.id, role: 'ADMIN' },
      },
    },
  });
  console.log(`[seed] Created group: ${group.name}`);

  // Seed some sample messages
  const sampleMessages = [
    'Welcome to ChatFlow! 🎉',
    'This is a real-time group chat built with TypeScript, Express 5, Socket.IO, and React 19.',
    'Try sending a message — it will appear instantly for all connected users.',
    'Check out the README for the full architecture and feature list.',
  ];

  for (const content of sampleMessages) {
    await prisma.message.create({
      data: {
        content,
        senderId: demoUser.id,
        groupId: group.id,
      },
    });
  }
  console.log(`[seed] Created ${String(sampleMessages.length)} sample messages`);

  await prisma.$disconnect();
  console.log('[seed] Done.');
  console.log(`\n  Demo credentials:\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}\n`);
}

main().catch((err: unknown) => {
  console.error('[seed] Fatal:', err);
  process.exit(1);
});
