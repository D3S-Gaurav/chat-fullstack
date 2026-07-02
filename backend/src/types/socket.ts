/**
 * @module types/socket — Strictly typed Socket.io event maps.
 *
 * Why typed events matter: Socket.io v4 supports typed event maps via generics.
 * This ensures that every `socket.emit()` and `socket.on()` call is
 * compile-time checked for event names and payload shapes.
 */

import type { AuthUser } from './api.js';

/** Events the server can emit TO clients. */
export interface ServerToClientEvents {
  'message:new': (payload: MessagePayload) => void;
  'typing:start': (payload: TypingPayload) => void;
  'typing:stop': (payload: TypingPayload) => void;
  'room:joined': (payload: { groupId: string; userId: string; username: string }) => void;
  'room:left': (payload: { groupId: string; userId: string; username: string }) => void;
  'user:online': (payload: { userId: string; username: string }) => void;
  'user:offline': (payload: { userId: string; username: string }) => void;
  'error': (payload: { message: string }) => void;
}

/** Events the client can emit TO the server. */
export interface ClientToServerEvents {
  'message:send': (payload: { groupId: string; content: string; tags?: string[] }) => void;
  'typing:start': (payload: { groupId: string }) => void;
  'typing:stop': (payload: { groupId: string }) => void;
  'room:join': (payload: { groupId: string }) => void;
  'room:leave': (payload: { groupId: string }) => void;
}

/** Internal server-to-server events (unused for now but required by the generic). */
export interface InterServerEvents {
  ping: () => void;
}

/** Data attached to each socket after authentication. */
export interface SocketData {
  user: AuthUser;
}

/** Shape of a message broadcast payload. */
export interface MessagePayload {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; username: string };
  groupId: string;
  tags: { name: string }[];
}

/** Shape of a typing indicator payload. */
export interface TypingPayload {
  groupId: string;
  userId: string;
  username: string;
}
