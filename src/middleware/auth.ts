import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
      emailVerified?: boolean;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token =
    req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, emailVerified: true },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireVerifiedEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      emailVerified: true,
      passwordHash: true,
      githubId: true,
      googleId: true,
    },
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const isOAuthUser = Boolean(user.githubId || user.googleId);
  if (isOAuthUser || user.emailVerified) {
    return next();
  }

  return res.status(403).json({
    error: 'Please verify your email before accessing the dashboard',
    code: 'EMAIL_NOT_VERIFIED',
  });
};

export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
