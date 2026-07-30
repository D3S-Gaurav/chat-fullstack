/**
 * @module __tests__/ratelimit — Rate limiter tests.
 *
 * Verifies that the message rate limiter (30/min) actually
 * returns 429 on the 31st request, and that the auth limiter
 * (10/15min, skip successful) blocks on the 11th failed attempt.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, registerUser, createGroup, cleanDatabase } from './setup.js';

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

describe('Message rate limiter (30/min)', () => {
  it('allows 30 messages then returns 429 on the 31st', async () => {
    const user = await registerUser({ username: 'ratelimit_msg' });
    const group = await createGroup(user.token, 'RateLimitGroup');

    // Send 30 messages — all should succeed
    for (let i = 0; i < 30; i++) {
      await request()
        .post('/api/messages')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ groupId: group.id, content: `Message ${String(i)}` })
        .expect(201);
    }

    // 31st should be rate-limited
    const res = await request()
      .post('/api/messages')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ groupId: group.id, content: 'Over the limit' })
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/too many requests/i);
  });
});

describe('Auth rate limiter (10/15min)', () => {
  it('blocks on the 11th failed login attempt', async () => {
    // Make 10 failed login attempts
    for (let i = 0; i < 10; i++) {
      await request()
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.dev', password: 'WrongPass1!' })
        .expect(401);
    }

    // 11th should be rate-limited
    const res = await request()
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.dev', password: 'WrongPass1!' })
      .expect(429);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/too many requests/i);
  });
});
