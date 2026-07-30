/**
 * @module __tests__/rooms — Group CRUD and RBAC tests.
 *
 * Covers: group creation (creator is ADMIN), MEMBER cannot add/remove,
 * ADMIN can add member, last admin protection, and filtered group listing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, registerUser, createGroup, cleanDatabase } from './setup.js';

let admin: { user: { id: string; email: string; username: string; role: string }; token: string };
let member: { user: { id: string; email: string; username: string; role: string }; token: string };
let groupId: string;

beforeAll(async () => {
  await cleanDatabase();
  admin = await registerUser({ username: 'rooms_admin' });
  member = await registerUser({ username: 'rooms_member' });

  const g = await createGroup(admin.token, 'RBACTestGroup');
  groupId = g.id;

  // Add member to the group
  await request()
    .post(`/api/groups/${groupId}/members`)
    .set('Authorization', `Bearer ${admin.token}`)
    .send({ userId: member.user.id })
    .expect(201);
});

afterAll(async () => {
  await cleanDatabase();
});

describe('POST /api/groups', () => {
  it('creator is assigned ADMIN role', async () => {
    const res = await request()
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(200);

    const members = res.body.data.members as { userId: string; role: string }[];
    const adminMember = members.find((m) => m.userId === admin.user.id);
    expect(adminMember).toBeDefined();
    expect(adminMember!.role).toBe('ADMIN');
  });
});

describe('RBAC: MEMBER cannot perform ADMIN actions', () => {
  it('MEMBER cannot add members → 403', async () => {
    const outsider = await registerUser({ username: 'rooms_outsider' });

    const res = await request()
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ userId: outsider.user.id })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('MEMBER cannot remove other members → 403', async () => {
    const res = await request()
      .delete(`/api/groups/${groupId}/members/${admin.user.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('MEMBER cannot update group → 403', async () => {
    const res = await request()
      .patch(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: 'Hijacked Name' })
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});

describe('ADMIN operations', () => {
  it('ADMIN can add a member → 201', async () => {
    const newUser = await registerUser({ username: 'rooms_added' });

    const res = await request()
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ userId: newUser.user.id })
      .expect(201);

    expect(res.body.success).toBe(true);
  });

  it('cannot remove the last admin → 400', async () => {
    // Admin is the only admin
    const res = await request()
      .delete(`/api/groups/${groupId}/members/${admin.user.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/last admin/i);
  });
});

describe('GET /api/groups', () => {
  it('returns only groups the user is a member of', async () => {
    const loner = await registerUser({ username: 'rooms_loner' });

    const res = await request()
      .get('/api/groups')
      .set('Authorization', `Bearer ${loner.token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Loner has no groups
    expect(res.body.data).toHaveLength(0);
  });
});
