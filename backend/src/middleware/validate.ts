import type { Request, Response, NextFunction } from 'express';
import * as z from 'zod';
import { ValidationError } from './errorHandler.js';

export function validate(
  schema: z.ZodType,
  target: 'body' | 'params' | 'query' = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      next(new ValidationError(result.error));
      return;
    }

    // Replace raw input with the parsed & coerced output
    switch (target) {
      case 'body':
        req.body = result.data;
        break;
      case 'params':
        req.params = result.data as typeof req.params;
        break;
      case 'query':
        req.query = result.data as typeof req.query;
        break;
    }

    next();
  };
}
