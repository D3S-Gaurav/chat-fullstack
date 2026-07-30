/**
 * @module __tests__/auth — Authentication endpoint tests.
 *
 * Covers: register, login, duplicate email, bad password,
 * JWT shape, and password policy enforcement.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, cleanDatabase } from './setup.js';

beforeAll(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});

describe('POST /api/auth/register', () => {
  it('returns 201 with user and JWT on valid input', async () => {
    const res = await request()
      .post('/api/auth/register')
      .send({
        username: 'authtest_reg',
        email: 'authtest_reg@test.dev',
        password: 'ValidPass1!',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      username: 'authtest_reg',
      email: 'authtest_reg@test.dev',
      role: 'MEMBER',
    });
    expect(res.body.data.user.id).toBeTypeOf('string');
    expect(res.body.data.token).toBeTypeOf('string');
    expect(res.body.data.token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('returns 409 on duplicate email', async () => {
    // First registration
    await request()
      .post('/api/auth/register')
      .send({
        username: 'authtest_dup1',
        email: 'duplicate@test.dev',
        password: 'ValidPass1!',
      })
      .expect(201);

    // Duplicate email
    const res = await request()
      .post('/api/auth/register')
      .send({
        username: 'authtest_dup2',
        email: 'duplicate@test.dev',
        password: 'ValidPass1!',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('enforces password policy — rejects weak passwords', async () => {
    const res = await request()
      .post('/api/auth/register')
      .send({
        username: 'authtest_weak',
        email: 'weak@test.dev',
        password: 'short',
      })
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });
});

describe('POST /api/auth/login', () => {
  const email = 'authtest_login@test.dev';
  const password = 'LoginPass1!';

  beforeAll(async () => {
    await request()
      .post('/api/auth/register')
      .send({ username: 'authtest_login', email, password })
      .expect(201);
  });

  it('returns 200 with user and JWT on correct credentials', async () => {
    const res = await request()
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.token).toBeTypeOf('string');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request()
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1!' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('returns 401 on non-existent email', async () => {
    const res = await request()
      .post('/api/auth/login')
      .send({ email: 'ghost@test.dev', password: 'SomePass1!' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('JWT contains expected fields (id, email, username, role)', async () => {
    const res = await request()
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const token = res.body.data.token as string;
    const payloadBase64 = token.split('.')[1]!;
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString()) as Record<string, unknown>;

    expect(payload).toHaveProperty('id');
    expect(payload).toHaveProperty('email', email);
    expect(payload).toHaveProperty('username', 'authtest_login');
    expect(payload).toHaveProperty('role', 'MEMBER');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('exp');
  });
});
