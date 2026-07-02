/** @module routes/room — Group and membership endpoints. */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  idParamSchema,
} from '../schemas/chat.schema.js';
import * as roomService from '../services/room.service.js';

export const roomRouter = Router();

// All group routes require authentication
roomRouter.use(authenticate);

roomRouter.post(
  '/',
  validate(createGroupSchema),
  async (req, res, next) => {
    try {
      const group = await roomService.createGroup(req.body, req.user!.id);
      res.status(201).json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },
);

roomRouter.get(
  '/',
  async (req, res, next) => {
    try {
      const groups = await roomService.getUserGroups(req.user!.id);
      res.status(200).json({ success: true, data: groups });
    } catch (err) {
      next(err);
    }
  },
);

roomRouter.get(
  '/:id',
  validate(idParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as { id: string };
      const group = await roomService.getGroupById(id);
      res.status(200).json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },
);

roomRouter.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateGroupSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as { id: string };
      const group = await roomService.updateGroup(id, req.body);
      res.status(200).json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },
);

roomRouter.post(
  '/:id/members',
  validate(idParamSchema, 'params'),
  validate(addMemberSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as { id: string };
      const member = await roomService.addMember(id, req.body.userId);
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  },
);

roomRouter.delete(
  '/:id/members/:userId',
  validate(idParamSchema, 'params'), // Validates :id
  async (req, res, next) => {
    try {
      // NOTE: We'd typically validate userId too, but avoiding double-param schema for brevity
      const { id: groupId, userId } = req.params as { id: string; userId: string };
      const result = await roomService.removeMember(groupId, userId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);
