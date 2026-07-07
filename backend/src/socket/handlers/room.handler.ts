/**
 * @module socket/handlers/room — Real-time room join/leave events.
 *
 * Handles `room:join` and `room:leave` events so the client can
 * dynamically subscribe/unsubscribe from group rooms after the
 * initial auto-join on connection. Both events validate payloads
 * via Zod and verify membership before acting.
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
import { socketRoomActionSchema } from '../../schemas/socket.schema.js';
import { logger } from '../../config/logger.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerRoomHandler(io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;

  socket.on('room:join', async (payload) => {
    try {
      // Validate the incoming payload
      const parsed = socketRoomActionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid room payload' });
        return;
      }

      // Verify the user is actually a member of this group before joining
      await assertMembership(parsed.data.groupId, user.id);
      await socket.join(parsed.data.groupId);

      // Notify the room that a user has joined
      io.to(parsed.data.groupId).emit('room:joined', {
        groupId: parsed.data.groupId,
        userId: user.id,
        username: user.username,
      });

      logger.debug({ userId: user.id, groupId: parsed.data.groupId }, 'Joined room');
    } catch (err) {
      logger.error({ err, userId: user.id, groupId: payload?.groupId }, 'Failed to join room');
      socket.emit('error', {
        message: err instanceof Error && 'statusCode' in err
          ? err.message
          : 'Failed to join room',
      });
    }
  });

  socket.on('room:leave', async (payload) => {
    try {
      // Validate the incoming payload
      const parsed = socketRoomActionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid room payload' });
        return;
      }

      // Verify the user is a member before allowing the leave broadcast
      // This prevents spoofing leave events for rooms the user isn't in
      await assertMembership(parsed.data.groupId, user.id);
      await socket.leave(parsed.data.groupId);

      // Notify the room that a user has left
      io.to(parsed.data.groupId).emit('room:left', {
        groupId: parsed.data.groupId,
        userId: user.id,
        username: user.username,
      });

      logger.debug({ userId: user.id, groupId: parsed.data.groupId }, 'Left room');
    } catch (err) {
      logger.error({ err, userId: user.id, groupId: payload?.groupId }, 'Failed to leave room');
      socket.emit('error', {
        message: err instanceof Error && 'statusCode' in err
          ? err.message
          : 'Failed to leave room',
      });
    }
  });
}
