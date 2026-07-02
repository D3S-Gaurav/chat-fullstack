/** @module routes/chat — Message endpoints. */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageLimiter } from '../middleware/rateLimiter.js';
import { sendMessageSchema, messageQuerySchema, type MessageQueryInput } from '../schemas/chat.schema.js';
import * as chatService from '../services/chat.service.js';

export const chatRouter = Router();

chatRouter.use(authenticate);

import { getIO } from '../socket/index.js';
import type { MessagePayload } from '../types/socket.js';

chatRouter.post(
  '/',
  messageLimiter,
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      const message = await chatService.sendMessage(req.user!.id, req.body);
      
      const io = getIO();
      if (io) {
        const broadcast: MessagePayload = {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          sender: message.sender,
          groupId: message.groupId,
          tags: message.tags,
        };
        io.to(message.groupId).emit('message:new', broadcast);
      }

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },
);

chatRouter.get(
  '/',
  validate(messageQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const query = req.query as unknown as MessageQueryInput;
      const result = await chatService.getGroupMessages(req.user!.id, query);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);
