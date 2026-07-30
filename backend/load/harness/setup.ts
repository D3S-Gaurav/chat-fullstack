/**
 * @module load/harness/setup — Provisions test data for k6 load tests.
 *
 * Creates N users via POST /api/auth/register, collects JWTs,
 * creates M groups, and assigns members round-robin. Writes
 * shared state to a JSON file that k6 scripts consume.
 *
 * Usage: npx tsx load/harness/setup.ts
 */

import {
  TARGET_HOST,
  USER_COUNT,
  GROUP_COUNT,
  MEMBERS_PER_GROUP,
  TEST_PASSWORD,
  SHARED_STATE_PATH,
} from './config.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

interface UserState {
  id: string;
  username: string;
  token: string;
}

interface SharedState {
  users: UserState[];
  groups: { id: string; name: string }[];
  targetHost: string;
}

async function api<T>(path: string, opts: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  const { method = 'GET', body, token } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${TARGET_HOST}${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${String(res.status)}: ${text}`);
  }

  const json = await res.json() as { data: T };
  return json.data;
}

async function main(): Promise<void> {
  console.log(`[setup] Target: ${TARGET_HOST}`);
  console.log(`[setup] Provisioning ${String(USER_COUNT)} users...`);

  // 1. Register users
  const users: UserState[] = [];
  for (let i = 0; i < USER_COUNT; i++) {
    const username = `loaduser_${String(i).padStart(4, '0')}`;
    const email = `${username}@loadtest.dev`;
    try {
      const data = await api<{ user: { id: string; username: string }; token: string }>(
        '/api/auth/register',
        { method: 'POST', body: { username, email, password: TEST_PASSWORD } },
      );
      users.push({ id: data.user.id, username: data.user.username, token: data.token });
    } catch (err) {
      // User may already exist from a previous run — try logging in
      const data = await api<{ user: { id: string; username: string }; token: string }>(
        '/api/auth/login',
        { method: 'POST', body: { email, password: TEST_PASSWORD } },
      );
      users.push({ id: data.user.id, username: data.user.username, token: data.token });
    }

    if ((i + 1) % 10 === 0) console.log(`  ${String(i + 1)}/${String(USER_COUNT)} users`);
  }

  // 2. Create groups (first user is the admin for all)
  console.log(`[setup] Creating ${String(GROUP_COUNT)} groups...`);
  const adminToken = users[0]!.token;
  const groups: { id: string; name: string }[] = [];
  for (let i = 0; i < GROUP_COUNT; i++) {
    const name = `LoadGroup_${String(i).padStart(3, '0')}`;
    const group = await api<{ id: string; name: string }>(
      '/api/groups',
      { method: 'POST', body: { name }, token: adminToken },
    );
    groups.push(group);
  }

  // 3. Assign members round-robin (skip user 0, already admin of all groups)
  console.log(`[setup] Assigning ${String(MEMBERS_PER_GROUP)} members per group...`);
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]!;
    for (let mi = 1; mi <= MEMBERS_PER_GROUP && mi < users.length; mi++) {
      const userIndex = ((gi * MEMBERS_PER_GROUP) + mi) % users.length;
      if (userIndex === 0) continue; // Skip admin
      const user = users[userIndex]!;
      try {
        await api('/api/groups/' + group.id + '/members', {
          method: 'POST',
          body: { userId: user.id },
          token: adminToken,
        });
      } catch {
        // Member may already exist from a previous run
      }
    }
  }

  // 4. Write shared state
  const state: SharedState = { users, groups, targetHost: TARGET_HOST };
  mkdirSync(dirname(SHARED_STATE_PATH), { recursive: true });
  writeFileSync(SHARED_STATE_PATH, JSON.stringify(state, null, 2));
  console.log(`[setup] Shared state written to ${SHARED_STATE_PATH}`);
  console.log('[setup] Done.');
}

main().catch((err: unknown) => {
  console.error('[setup] Fatal:', err);
  process.exit(1);
});
