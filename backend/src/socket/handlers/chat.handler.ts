/**
 * @module socket/handlers/chat — Real-time message broadcasting.
 *
 * Handles the `message:send` event: validates the payload via Zod,
 * persists the message via the chat service, and broadcasts it to the group room.
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
import { socketSendMessageSchema } from '../../schemas/socket.schema.js';
import { logger } from '../../config/logger.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function registerChatHandler(io: TypedServer, socket: TypedSocket): void {
  const user = socket.data.user;

  socket.on('message:send', async (payload) => {
    try {
      // Validate the incoming payload before processing
      const parsed = socketSendMessageSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid message payload' });
        return;
      }

      // Persist via the same service the REST API uses
      const message = await sendMessage(user.id, {
        groupId: parsed.data.groupId,
        content: parsed.data.content,
        tags: parsed.data.tags,
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
      io.to(parsed.data.groupId).emit('message:new', broadcast);

      logger.debug(
        { messageId: message.id, groupId: parsed.data.groupId, senderId: user.id },
        'Message broadcast to room',
      );
    } catch (err) {
      logger.error({ err, userId: user.id }, 'Failed to send message via socket');
      // Never expose raw internal error messages to the client
      socket.emit('error', {
        message: err instanceof Error && 'statusCode' in err
          ? err.message
          : 'Failed to send message',
      });
    }
  });
}
