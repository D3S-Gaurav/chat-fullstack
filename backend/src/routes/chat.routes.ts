/** @module routes/chat — Message endpoints. */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageLimiter } from '../middleware/rateLimiter.js';
import { sendMessageSchema, messageQuerySchema, type MessageQueryInput } from '../schemas/chat.schema.js';
import * as chatService from '../services/chat.service.js';

export const chatRouter = Router();

chatRouter.use(authenticate);

chatRouter.post(
  '/',
  messageLimiter,
  validate(sendMessageSchema),
  async (req, res, next) => {
    try {
      const message = await chatService.sendMessage(req.user!.id, req.body);
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
