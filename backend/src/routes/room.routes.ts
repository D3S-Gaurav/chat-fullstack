/** @module routes/room — Group and membership endpoints. */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createGroupSchema,
  updateGroupSchema,
  addMemberSchema,
  idParamSchema,
  memberActionParamSchema,
} from '../schemas/chat.schema.js';
import {
  createGroup,
  getGroupById,
  updateGroup,
  addMember,
  removeMember,
  getUserGroups,
} from '../services/room.service.js';
import { getIO } from '../socket/index.js';

export const roomRouter = Router();

// All group routes require authentication
roomRouter.use(authenticate);

roomRouter.post(
  '/',
  validate(createGroupSchema),
  async (req, res, next) => {
    try {
      const group = await createGroup(req.body, req.user!.id);
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
      const groups = await getUserGroups(req.user!.id);
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
      const { id } = req.params as { id: string };
      const group = await getGroupById(id, req.user!.id);
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
      const { id } = req.params as { id: string };
      const group = await updateGroup(id, req.body, req.user!.id);
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
      const { id } = req.params as { id: string };
      const { userId } = req.body;
      const member = await addMember(id, userId, req.user!.id);
      res.status(201).json({ success: true, data: member });
    } catch (err) {
      next(err);
    }
  },
);

roomRouter.delete(
  '/:id/members/:userId',
  validate(memberActionParamSchema, 'params'),
  async (req, res, next) => {
    try {
      const { id: groupId, userId } = req.params as { id: string; userId: string };
      
      const result = await removeMember(groupId, userId, req.user!.id);
      
      // Evict the removed user's socket from the room
      const io = getIO();
      if (io) {
        const sockets = await io.in(groupId).fetchSockets();
        for (const s of sockets) {
          if (s.data.user && s.data.user.id === userId) {
            await s.leave(groupId);
          }
        }
      }

      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);
