import { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { JwtPayload } from '../../middleware/auth';
import {
  issueAuthToken,
  setAuthCookie,
  clearAuthCookie,
  publicUserSelect,
} from '../../lib/authTokens';
import {
  createEmailUser,
  validateEmailLogin,
  verifyEmailToken,
  resendVerificationEmail,
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
} from './auth.service';
import {
  connectGitHubIntegration,
  isGitHubIntegrationState,
} from '../integrations/githubIntegration.service';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const resendSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

const finishOAuth = (res: Response, user: { id: string; role: string }) => {
  const token = issueAuthToken(user.id, user.role);
  setAuthCookie(res, token);
  res.redirect(`${env.FRONTEND_URL}/dashboard`);
};

const getAuthenticatedUserId = async (req: Request) => {
  const token =
    req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new AppError('Authentication required to connect GitHub', 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    return user.id;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401);
  }
};

export const register = async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const user = await createEmailUser(body.email, body.password, body.name);

  res.status(201).json({
    message: 'Account created. Please check your email to verify your account.',
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const user = await validateEmailLogin(body.email, body.password);
  const token = issueAuthToken(user.id, user.role);
  setAuthCookie(res, token);

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: publicUserSelect,
  });

  res.json({ user: profile });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) throw new AppError('Verification token is required', 400);

  const user = await verifyEmailToken(token);
  const jwtToken = issueAuthToken(user.id, user.role);
  setAuthCookie(res, jwtToken);

  res.json({
    message: 'Email verified successfully',
    user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }),
  });
};

export const resendVerification = async (req: Request, res: Response) => {
  const { email } = resendSchema.parse(req.body);
  await resendVerificationEmail(email);
  res.json({ message: 'If an account exists, a verification email has been sent.' });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await requestPasswordReset(email);
  res.json({ message: 'If an account exists, a password reset email has been sent.' });
};

export const resetPassword = async (req: Request, res: Response) => {
  const body = resetPasswordSchema.parse(req.body);
  const user = await resetPasswordWithToken(body.token, body.password);
  const jwtToken = issueAuthToken(user.id, user.role);
  setAuthCookie(res, jwtToken);

  res.json({
    message: 'Password reset successfully',
    user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }),
  });
};

export const changePasswordHandler = async (req: Request, res: Response) => {
  const body = changePasswordSchema.parse(req.body);
  await changePassword(req.user!.id, body.currentPassword, body.newPassword);
  res.json({ message: 'Password changed successfully' });
};

export const githubLogin = passport.authenticate('github', {
  scope: ['read:user', 'user:email'],
  session: false,
});

export const githubCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  if (isGitHubIntegrationState(state)) {
    if (!code || !state) {
      throw new AppError('GitHub OAuth code and state are required', 400);
    }

    const userId = await getAuthenticatedUserId(req);
    const result = await connectGitHubIntegration(userId, code, state);
    return res.json(result);
  }

  passport.authenticate('github', { session: false }, (err: Error, user: any) => {
    if (err || !user) {
      return res.redirect(`${env.FRONTEND_URL}/sign-in?error=github_auth_failed`);
    }
    finishOAuth(res, user);
  })(req, res);
};

export const googleLogin = (req: Request, res: Response, next: Function) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return next(new AppError('Google OAuth is not configured', 503));
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
};

export const googleCallback = (req: Request, res: Response) => {
  passport.authenticate('google', { session: false }, (err: Error, user: any) => {
    if (err || !user) {
      return res.redirect(`${env.FRONTEND_URL}/sign-in?error=google_auth_failed`);
    }
    finishOAuth(res, user);
  })(req, res);
};

export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: publicUserSelect,
  });

  if (!user) throw new AppError('User not found', 404);
  res.json(user);
};

export const logout = (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out successfully' });
};
