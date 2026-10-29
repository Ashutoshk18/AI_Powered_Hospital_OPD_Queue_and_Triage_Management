import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { AuthUser, Role } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header. Expected Bearer token.');
  }

  const token = authHeader.substring(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
    req.user = payload;
    next();
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired authentication token.');
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Role '${req.user.role}' is not authorized to access this resource. Required roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
}
