/** @module routes/user — User profile endpoints. */

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as userService from '../services/user.service.js';

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get('/me', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.user!.id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// Admin-only route
userRouter.get(
  '/',
  requireRole('ADMIN'),
  async (_req, res, next) => {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  },
);
