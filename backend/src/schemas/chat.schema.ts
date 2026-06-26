/** @module schemas/chat — Zod schemas for chat and group routes. */

import * as z from 'zod';

/** POST /messages — send a message to a group. */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, { error: 'Message cannot be empty' })
    .max(2000, { error: 'Message must be at most 2000 characters' }),

  groupId: z.uuid({ error: 'Invalid group ID' }),

  /** Optional tag names to attach to the message. */
  tags: z
    .array(
      z.string()
        .min(1, { error: 'Tag name cannot be empty' })
        .max(50, { error: 'Tag name must be at most 50 characters' }),
    )
    .max(10, { error: 'At most 10 tags per message' })
    .optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** GET /messages?groupId=...&cursor=...&limit=... — paginated message history. */
export const messageQuerySchema = z.object({
  groupId: z.uuid({ error: 'Invalid group ID' }),

  /** Cursor-based pagination: pass the last message ID from the previous page. */
  cursor: z.uuid({ error: 'Invalid cursor ID' }).optional(),

  /** Number of messages to fetch (1–100, default 50). */
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),
});

export type MessageQueryInput = z.infer<typeof messageQuerySchema>;

/** POST /groups — create a new group. */
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Group name must be at least 2 characters' })
    .max(100, { error: 'Group name must be at most 100 characters' }),

  description: z
    .string()
    .max(500, { error: 'Description must be at most 500 characters' })
    .optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

/** PATCH /groups/:id — update a group's details. */
export const updateGroupSchema = z.object({
  name: z
    .string()
    .min(2, { error: 'Group name must be at least 2 characters' })
    .max(100, { error: 'Group name must be at most 100 characters' })
    .optional(),

  description: z
    .string()
    .max(500, { error: 'Description must be at most 500 characters' })
    .optional(),
});

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

/** POST /groups/:id/members — add a member to a group. */
export const addMemberSchema = z.object({
  userId: z.uuid({ error: 'Invalid user ID' }),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;

/** Route params containing a single UUID `:id`. */
export const idParamSchema = z.object({
  id: z.uuid({ error: 'Invalid ID parameter' }),
});

export type IdParam = z.infer<typeof idParamSchema>;
