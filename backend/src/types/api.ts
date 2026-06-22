/** User roles for authorization checks. */
export type Role = 'ADMIN' | 'MODERATOR' | 'MEMBER';

/** Decoded JWT payload attached to authenticated requests. */
export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: Role;
}

/**
 * Augment the Express Request interface so `req.user` is available
 * on any authenticated route without manual casting.
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
