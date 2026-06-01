import { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';

export const githubLogin = passport.authenticate('github', {
  scope: ['read:user', 'user:email'],
});

export const githubCallback = (req: Request, res: Response) => {
  passport.authenticate('github', { session: false }, (err: Error, user: any) => {
    if (err || !user) {
      return res.redirect(`${env.FRONTEND_URL}/auth/error`);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  })(req, res);
};

export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, username: true, name: true, email: true,
      avatarUrl: true, bio: true, location: true,
      websiteUrl: true, githubUrl: true, role: true,
      contributorScore: true, createdAt: true,
    },
  });
  res.json(user);
};

export const logout = (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
};
