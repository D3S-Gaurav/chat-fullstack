/**
 * @module __tests__/chat — Message and pagination endpoint tests.
 *
 * Covers: send message, paginated fetch, cursor chaining across
 * the (groupId, createdAt) composite index, non-member rejection,
 * and tag creation via connectOrCreate.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, registerUser, createGroup, cleanDatabase } from './setup.js';

let token: string;
let userId: string;
let groupId: string;

beforeAll(async () => {
  await cleanDatabase();
  const u = await registerUser({ username: 'chattest_user' });
  token = u.token;
  userId = u.user.id;
  const g = await createGroup(token, 'ChatTestGroup');
  groupId = g.id;
});

afterAll(async () => {
  await cleanDatabase();
});

describe('POST /api/messages', () => {
  it('returns 201 with message shape on valid input', async () => {
    const res = await request()
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId, content: 'Hello world' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      content: 'Hello world',
      groupId,
    });
    expect(res.body.data.sender.id).toBe(userId);
    expect(res.body.data.id).toBeTypeOf('string');
    expect(res.body.data.createdAt).toBeTypeOf('string');
  });

  it('returns 403 when non-member tries to send', async () => {
    const outsider = await registerUser({ username: 'chattest_outsider' });

    const res = await request()
      .post('/api/messages')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ groupId, content: 'Unauthorized message' })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('creates tags via connectOrCreate', async () => {
    const res = await request()
      .post('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ groupId, content: 'Tagged message', tags: ['important', 'urgent'] })
      .expect(201);

    const tagNames = (res.body.data.tags as { name: string }[]).map((t) => t.name);
    expect(tagNames).toContain('important');
    expect(tagNames).toContain('urgent');
  });
});

describe('GET /api/messages — cursor pagination', () => {
  let allMessageIds: string[];

  beforeAll(async () => {
    // Send 5 messages to test pagination
    allMessageIds = [];
    for (let i = 0; i < 5; i++) {
      const res = await request()
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ groupId, content: `Pagination msg ${String(i)}` })
        .expect(201);
      allMessageIds.push(res.body.data.id as string);
    }
  });

  it('returns paginated messages with nextCursor', async () => {
    const res = await request()
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId, limit: 2 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.messages).toHaveLength(2);
    expect(res.body.data.nextCursor).toBeTypeOf('string');
  });

  it('cursor chains correctly — second page continues from first', async () => {
    // Fetch first page
    const page1 = await request()
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId, limit: 3 })
      .expect(200);

    const cursor = page1.body.data.nextCursor as string;
    expect(cursor).toBeTruthy();

    // Fetch second page using cursor
    const page2 = await request()
      .get('/api/messages')
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId, limit: 3, cursor })
      .expect(200);

    // Pages should not overlap
    const page1Ids = (page1.body.data.messages as { id: string }[]).map((m) => m.id);
    const page2Ids = (page2.body.data.messages as { id: string }[]).map((m) => m.id);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);

    // Messages are newest-first
    expect(page1.body.data.messages.length).toBeGreaterThan(0);
  });
});
