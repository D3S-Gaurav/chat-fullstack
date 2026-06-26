/** @module schemas/auth — Zod schemas for authentication routes. */

import * as z from 'zod';

/** POST /auth/register — create a new user account. */
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, { error: 'Username must be at least 3 characters' })
    .max(30, { error: 'Username must be at most 30 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      error: 'Username may only contain letters, numbers, and underscores',
    }),

  email: z
    .email({ error: 'Invalid email address' }),

  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters' })
    .max(128, { error: 'Password must be at most 128 characters' }),
});

/** Inferred type for register request body. */
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /auth/login — authenticate with email + password. */
export const loginSchema = z.object({
  email: z.email({ error: 'Invalid email address' }),

  password: z
    .string()
    .min(1, { error: 'Password is required' }),
});

/** Inferred type for login request body. */
export type LoginInput = z.infer<typeof loginSchema>;
