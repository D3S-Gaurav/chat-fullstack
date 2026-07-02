/** @module services/chat — Message creation and querying. */

import { prisma } from '../database/prisma.js';
import type { SendMessageInput, MessageQueryInput } from '../schemas/chat.schema.js';
import { assertMembership } from './room.service.js';

/**
 * Sends a message to a group. Ensures the sender is a member of the group.
 * If tags are provided, they are created if they don't exist, and linked to the message.
 */
export async function sendMessage(senderId: string, input: SendMessageInput) {
  // Ensure the user is a member of the group they are trying to message
  await assertMembership(input.groupId, senderId);

  return prisma.message.create({
    data: {
      content: input.content,
      groupId: input.groupId,
      senderId,
      ...(input.tags && input.tags.length > 0 && {
        tags: {
          connectOrCreate: input.tags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
      }),
    },
    include: {
      sender: { select: { id: true, username: true } },
      tags: { select: { name: true } },
    },
  });
}

/**
 * Fetches paginated messages for a group using cursor-based pagination.
 * Ensures the requesting user is a member of the group.
 */
export async function getGroupMessages(userId: string, query: MessageQueryInput) {
  // Ensure the user is a member of the group they are querying
  await assertMembership(query.groupId, userId);

  const messages = await prisma.message.findMany({
    where: { groupId: query.groupId },
    take: query.limit,
    ...(query.cursor && {
      skip: 1, // Skip the cursor itself
      cursor: { id: query.cursor },
    }),
    orderBy: { createdAt: 'desc' }, // Newest first
    include: {
      sender: { select: { id: true, username: true } },
      tags: { select: { name: true } },
    },
  });

  // Determine the next cursor
  const nextCursor = messages.length === query.limit ? messages[messages.length - 1]?.id : undefined;

  return {
    messages,
    nextCursor,
  };
}
