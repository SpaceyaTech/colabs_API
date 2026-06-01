import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { uploadFile } from '../../lib/minio';
import { getUserContributions } from '../../lib/github';

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
});

export const getUserByUsername = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: {
      id: true, username: true, name: true, email: true,
      avatarUrl: true, bio: true, location: true,
      websiteUrl: true, githubUrl: true, role: true,
      contributorScore: true, createdAt: true,
      projects: { select: { id: true, name: true, language: true, stars: true } },
      _count: { select: { issueClaims: true, proposals: true } },
    },
  });

  if (!user) throw new AppError('User not found', 404);
  res.json(user);
};

export const updateProfile = async (req: Request, res: Response) => {
  const body = updateUserSchema.parse(req.body);

  let avatarUrl: string | undefined;
  if (req.file) {
    avatarUrl = await uploadFile(req.file, 'avatars');
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { ...body, ...(avatarUrl ? { avatarUrl } : {}) },
    select: {
      id: true, username: true, name: true, avatarUrl: true,
      bio: true, location: true, websiteUrl: true, role: true,
    },
  });

  res.json(user);
};

export const getUserContributionStats = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { username: req.params.username },
    select: { username: true },
  });
  if (!user) throw new AppError('User not found', 404);

  const githubData = await getUserContributions(user.username);
  res.json({
    publicRepos: githubData.public_repos,
    followers: githubData.followers,
    following: githubData.following,
    githubCreatedAt: githubData.created_at,
  });
};
