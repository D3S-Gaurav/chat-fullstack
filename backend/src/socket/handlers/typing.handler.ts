/**
 * @module socket/handlers/typing — Typing indicator events.
 *
 * Handles `typing:start` and `typing:stop` events. These are
 * lightweight fire-and-forget broadcasts — no database persistence.
 * The server validates payloads and verifies the user has actually
 * joined the target room before relaying indicators.
 */

import type { Socket } from 'socket.io';
import type { TypedServer } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.js';
import { socketTypingSchema } from '../../schemas/socket.schema.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerTypingHandler(_io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;

  socket.on('typing:start', (payload) => {
    // Validate the incoming payload
    const parsed = socketTypingSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid typing payload' });
      return;
    }

    // Only broadcast if the socket has actually joined this room
    // This prevents spoofing typing indicators in rooms the user hasn't joined
    if (!socket.rooms.has(parsed.data.groupId)) return;

    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(parsed.data.groupId).emit('typing:start', {
      groupId: parsed.data.groupId,
      userId: user.id,
      username: user.username,
    });
  });

  socket.on('typing:stop', (payload) => {
    const parsed = socketTypingSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid typing payload' });
      return;
    }

    if (!socket.rooms.has(parsed.data.groupId)) return;

    socket.to(parsed.data.groupId).emit('typing:stop', {
      groupId: parsed.data.groupId,
      userId: user.id,
      username: user.username,
    });
  });
}
