/** @module services/user — User profile operations. */

import { prisma } from '../database/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

/** Returns a user's public profile by ID. */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  if (!user) {
    throw new AppError(404, 'User not found');
  }

  return user;
}

/** Returns all users (admin use). */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}
