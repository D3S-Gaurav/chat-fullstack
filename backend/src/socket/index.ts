/**
 * @module socket/index — Socket.io server bootstrap and JWT authentication.
 *
 * Attaches to the existing HTTP server created in server.ts.
 * Every socket connection is authenticated via a JWT handshake before
 * any event handlers are registered.
 */

import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from '../database/prisma.js';
import { registerChatHandler } from './handlers/chat.handler.js';
import { registerRoomHandler } from './handlers/room.handler.js';
import { registerTypingHandler } from './handlers/typing.handler.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from '../types/socket.js';
import type { AuthUser } from '../types/api.js';

/** Fully typed Socket.io server instance. */
export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** Tracks online users: userId → Set of socket IDs (supports multiple tabs). */
const onlineUsers = new Map<string, Set<string>>();

/** Creates and configures the Socket.io server. */
export function initializeSocket(httpServer: HttpServer): TypedServer {
  const io: TypedServer = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGINS,
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // ── JWT Authentication Middleware ────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined;

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection Lifecycle ─────────────────────────────────────────
  io.on('connection', async (socket) => {
    const user = socket.data.user;
    logger.info({ userId: user.id, socketId: socket.id }, 'Socket connected');

    // Track online status (supports multiple tabs per user)
    if (!onlineUsers.has(user.id)) {
      onlineUsers.set(user.id, new Set());
      // Only broadcast "online" on first connection (not additional tabs)
      io.emit('user:online', { userId: user.id, username: user.username });
    }
    onlineUsers.get(user.id)!.add(socket.id);

    // Auto-join all groups the user is a member of
    try {
      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.id },
        select: { groupId: true },
      });

      for (const { groupId } of memberships) {
        await socket.join(groupId);
      }

      logger.debug(
        { userId: user.id, rooms: memberships.map((m) => m.groupId) },
        'Auto-joined group rooms',
      );
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to auto-join rooms');
    }

    // Register domain-specific event handlers
    registerChatHandler(io, socket);
    registerRoomHandler(io, socket);
    registerTypingHandler(io, socket);

    // ── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.info({ userId: user.id, socketId: socket.id, reason }, 'Socket disconnected');

      const userSockets = onlineUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(socket.id);
        // Only broadcast "offline" when ALL tabs are closed
        if (userSockets.size === 0) {
          onlineUsers.delete(user.id);
          io.emit('user:offline', { userId: user.id, username: user.username });
        }
      }
    });
  });

  return io;
}
