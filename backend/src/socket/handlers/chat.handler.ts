/**
 * @module socket/handlers/chat — Real-time message broadcasting.
 *
 * Handles the `message:send` event: validates the payload, persists
 * the message via the chat service, and broadcasts it to the group room.
 */

import type { Socket } from 'socket.io';
import type { TypedServer } from '../index.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  MessagePayload,
} from '../../types/socket.js';
import { sendMessage } from '../../services/chat.service.js';
import { logger } from '../../config/logger.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerChatHandler(io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;

  socket.on('message:send', async (payload) => {
    try {
      // Persist via the same service the REST API uses
      const message = await sendMessage(user.id, {
        groupId: payload.groupId,
        content: payload.content,
        tags: payload.tags,
      });

      const broadcast: MessagePayload = {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        sender: message.sender,
        groupId: message.groupId,
        tags: message.tags,
      };

      // Broadcast to everyone in the group room (including the sender)
      io.to(payload.groupId).emit('message:new', broadcast);

      logger.debug(
        { messageId: message.id, groupId: payload.groupId, senderId: user.id },
        'Message broadcast to room',
      );
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to send message via socket');
      socket.emit('error', {
        message: err instanceof Error ? err.message : 'Failed to send message',
      });
    }
  });
}
