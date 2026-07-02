/** @module services/room — Group (room) CRUD and membership management. */

import { prisma } from '../database/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateGroupInput, UpdateGroupInput } from '../schemas/chat.schema.js';

/** Creates a new group and adds the creator as an ADMIN member. */
export async function createGroup(input: CreateGroupInput, creatorId: string) {
  return prisma.group.create({
    data: {
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      members: {
        create: { userId: creatorId, role: 'ADMIN' },
      },
    },
    include: {
      members: { select: { userId: true, role: true } },
    },
  });
}

/** Returns a group by ID with its members. */
export async function getGroupById(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: {
          userId: true,
          role: true,
          user: { select: { id: true, username: true } },
        },
      },
      _count: { select: { messages: true } },
    },
  });

  if (!group) {
    throw new AppError(404, 'Group not found');
  }

  return group;
}

/** Returns all groups a user is a member of. */
export async function getUserGroups(userId: string) {
  return prisma.group.findMany({
    where: { members: { some: { userId } } },
    include: {
      _count: { select: { members: true, messages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Updates a group's name and/or description. */
export async function updateGroup(groupId: string, input: UpdateGroupInput) {
  await assertGroupExists(groupId);

  return prisma.group.update({
    where: { id: groupId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
    },
  });
}

/** Adds a user to a group as a MEMBER. */
export async function addMember(groupId: string, userId: string) {
  await assertGroupExists(groupId);

  return prisma.groupMember.create({
    data: { groupId, userId, role: 'MEMBER' },
  });
}

/** Removes a user from a group. */
export async function removeMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    throw new AppError(404, 'User is not a member of this group');
  }

  return prisma.groupMember.delete({
    where: { id: membership.id },
  });
}

/** Checks if a user is a member of a group. Throws 403 if not. */
export async function assertMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });

  if (!membership) {
    throw new AppError(403, 'You are not a member of this group');
  }

  return membership;
}

/** Throws 404 if the group does not exist. */
async function assertGroupExists(groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) {
    throw new AppError(404, 'Group not found');
  }
}
