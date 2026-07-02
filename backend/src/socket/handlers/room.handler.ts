/**
 * @module socket/handlers/room — Real-time room join/leave events.
 *
 * Handles `room:join` and `room:leave` events so the client can
 * dynamically subscribe/unsubscribe from group rooms after the
 * initial auto-join on connection.
 */

import type { Socket } from 'socket.io';
import type { TypedServer } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.js';
import { assertMembership } from '../../services/room.service.js';
import { logger } from '../../config/logger.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerRoomHandler(io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;

  socket.on('room:join', async (payload) => {
    try {
      // Verify the user is actually a member of this group before joining
      await assertMembership(payload.groupId, user.id);
      await socket.join(payload.groupId);

      // Notify the room that a user has joined
      io.to(payload.groupId).emit('room:joined', {
        groupId: payload.groupId,
        userId: user.id,
        username: user.username,
      });

      logger.debug({ userId: user.id, groupId: payload.groupId }, 'Joined room');
    } catch (err) {
      logger.error({ err, userId: user.id, groupId: payload.groupId }, 'Failed to join room');
      socket.emit('error', {
        message: err instanceof Error ? err.message : 'Failed to join room',
      });
    }
  });

  socket.on('room:leave', async (payload) => {
    await socket.leave(payload.groupId);

    // Notify the room that a user has left
    io.to(payload.groupId).emit('room:left', {
      groupId: payload.groupId,
      userId: user.id,
      username: user.username,
    });

    logger.debug({ userId: user.id, groupId: payload.groupId }, 'Left room');
  });
}
