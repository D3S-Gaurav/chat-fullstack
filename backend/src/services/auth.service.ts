/** @module services/auth — Registration, login, and JWT token management. */

import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { prisma } from '../database/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type { AuthUser } from '../types/api.js';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema.js';

const scryptAsync = promisify(scrypt);
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

/** Hashes a plaintext password with a random salt using scrypt. */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

/** Verifies a plaintext password against a stored hash. */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(hash, 'hex');
  return timingSafeEqual(derivedKey, storedKey);
}

/** Signs a JWT containing the user's id, email, username, and role. */
function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions['expiresIn']> },
  );
}

/** Creates a new user and returns a signed JWT. */
export async function register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
      },
      select: { id: true, email: true, username: true, role: true },
    });

    const token = signToken(user);
    return { user, token };
  } catch (err: any) {
    if (err && err.code === 'P2002') {
      const target = err.meta?.target as string[];
      const field = target ? target.join(', ') : 'field';
      throw new AppError(409, `An account with that ${field} already exists.`);
    }
    throw err;
  }
}

/** Authenticates a user by email + password and returns a signed JWT. */
export async function login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, username: true, role: true, passwordHash: true },
  });

  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const authUser: AuthUser = { id: user.id, email: user.email, username: user.username, role: user.role };
  const token = signToken(authUser);
  return { user: authUser, token };
}
