/**
 * @module socket/handlers/typing — Typing indicator events.
 *
 * Handles `typing:start` and `typing:stop` events. These are
 * lightweight fire-and-forget broadcasts — no database persistence.
 * The server relays them to everyone else in the group room
 * (excluding the sender via `socket.to()` instead of `io.to()`).
 */

import type { Socket } from 'socket.io';
import type { TypedServer } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../../types/socket.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerTypingHandler(_io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;

  socket.on('typing:start', (payload) => {
    // Broadcast to everyone in the room EXCEPT the sender
    socket.to(payload.groupId).emit('typing:start', {
      groupId: payload.groupId,
      userId: user.id,
      username: user.username,
    });
  });

  socket.on('typing:stop', (payload) => {
    socket.to(payload.groupId).emit('typing:stop', {
      groupId: payload.groupId,
      userId: user.id,
      username: user.username,
    });
  });
}
