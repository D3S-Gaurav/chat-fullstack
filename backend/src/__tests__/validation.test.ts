/**
 * @module __tests__/validation — Zod schema rejection tests.
 *
 * Verifies that malformed REST payloads are rejected with 422
 * before reaching the service layer. Covers both body and
 * query/param validation.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, registerUser, cleanDatabase } from './setup.js';

let token: string;

beforeAll(async () => {
  await cleanDatabase();
  const u = await registerUser({ username: 'validation_user' });
  token = u.token;
});

afterAll(async () => {
  await cleanDatabase();
});

describe('Registration validation', () => {
  it('rejects empty username → 422', async () => {
    const res = await request()
      .post('/api/auth/register')
      .send({ username: '', email: 'valid@test.dev', password: 'ValidPass1!' })
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects short password (< 8 chars) → 422', async () => {
    const res = await request()
      .post('/api/auth/register')
      .send({ username: 'val_short', email: 'short@test.dev', password: 'Ab1!' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });

  it('rejects password without special character → 422', async () => {
    const res = await request()
      .post('/api/auth/register')
      .send({ username: 'val_nospec', email: 'nospec@test.dev', password: 'ValidPass1' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});

describe('Message validation', () => {
  it('rejects empty content → 422', async () => {
    const res = await request()
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId: '00000000-0000-0000-0000-000000000000', content: '' })
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });

  it('rejects invalid groupId (not UUID) → 422', async () => {
    const res = await request()
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId: 'not-a-uuid', content: 'Hello' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});

describe('Message query validation', () => {
  it('rejects invalid cursor (not UUID) → 422', async () => {
    const res = await request()
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: '00000000-0000-0000-0000-000000000000', cursor: 'bad' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});

describe('Group param validation', () => {
  it('rejects invalid group ID param → 422', async () => {
    const res = await request()
      .get('/api/groups/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});
