import { Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export const issueAuthToken = (userId: string, role: string) =>
  jwt.sign(
    { userId, role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
  );

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie('token');
};

export const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

export const generateUsernameFromEmail = (email: string) => {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24);

  const suffix = crypto.randomBytes(2).toString('hex');
  return `${base || 'user'}_${suffix}`;
};

export const publicUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  avatarUrl: true,
  bio: true,
  location: true,
  websiteUrl: true,
  githubUrl: true,
  role: true,
  contributorScore: true,
  emailVerified: true,
  createdAt: true,
} as const;
