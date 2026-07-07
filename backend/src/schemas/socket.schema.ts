/** @module schemas/socket — Zod schemas for Socket.io event payload validation. */

import * as z from 'zod';

/** Validates `message:send` socket payloads. */
export const socketSendMessageSchema = z.object({
  groupId: z.uuid({ error: 'Invalid group ID' }),
  content: z
    .string()
    .min(1, { error: 'Message cannot be empty' })
    .max(2000, { error: 'Message must be at most 2000 characters' }),
  tags: z
    .array(
      z.string()
        .min(1, { error: 'Tag name cannot be empty' })
        .max(50, { error: 'Tag name must be at most 50 characters' }),
    )
    .max(10, { error: 'At most 10 tags per message' })
    .optional(),
});

/** Validates `room:join` and `room:leave` socket payloads. */
export const socketRoomActionSchema = z.object({
  groupId: z.uuid({ error: 'Invalid group ID' }),
});

/** Validates `typing:start` and `typing:stop` socket payloads. */
export const socketTypingSchema = z.object({
  groupId: z.uuid({ error: 'Invalid group ID' }),
});
