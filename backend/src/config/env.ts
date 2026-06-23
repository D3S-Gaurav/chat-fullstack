import * as z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  /** PostgreSQL connection string (Supabase). */
  DATABASE_URL: z.url({ protocol: /^(postgresql|postgres)$/ }),

  /** Comma-separated list of allowed origins for CORS. */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((val) => val.split(',').map((origin) => origin.trim())),

  /** Secret used to sign and verify JSON Web Tokens. */
  JWT_SECRET: z
    .string()
    .min(32, { error: 'JWT_SECRET must be at least 32 characters for security' }),

  /** JWT expiry duration (e.g. "7d", "24h"). */
  JWT_EXPIRES_IN: z.string().default('7d'),
});

/**
 * Parse `process.env` against the schema.
 * Throws a formatted error on boot if any variable is missing or invalid.
 */
function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse({ ...process.env });

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[config/env] Invalid environment variables:\n${formatted}\n\n` +
      'Check your .env file against .env.example.'
    );
  }

  return result.data;
}

/** Validated, typed environment config. Import this instead of process.env. */
export const env = validateEnv();

/** Re-export the inferred type for use in function signatures. */
export type Env = z.infer<typeof envSchema>;
