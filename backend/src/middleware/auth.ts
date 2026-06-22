/** @module middleware/auth — JWT authentication and role-based authorization. */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, ExpiredTokenError } from './errorHandler.js';
import type { AuthUser, Role } from '../types/api.js';

// Ensure the augmentation in types/api.ts is picked up
import '../types/api.js';

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError(401, 'No token provided'));
    return;
  }

  const token = header.slice(7); // strip "Bearer "

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new ExpiredTokenError());
      return;
    }
    next(new AppError(401, 'Invalid token'));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      next(new AppError(401, 'No token provided'));
      return;
    }

    if (!roles.includes(user.role)) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }

    next();
  };
}
