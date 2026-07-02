/** @module routes/auth — Authentication endpoints. */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req, res, next) => {
    try {
      const { user, token } = await authService.register(req.body);
      res.status(201).json({ success: true, data: { user, token } });
    } catch (err) {
      next(err);
    }
  },
);

authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const { user, token } = await authService.login(req.body);
      res.status(200).json({ success: true, data: { user, token } });
    } catch (err) {
      next(err);
    }
  },
);
