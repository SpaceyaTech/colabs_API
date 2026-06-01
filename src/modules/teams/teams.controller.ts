import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { uploadFile } from '../../lib/minio';

const createTeamSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const createTeam = async (req: Request, res: Response) => {
  const body = createTeamSchema.parse(req.body);

  let logoUrl: string | undefined;
  if (req.file) logoUrl = await uploadFile(req.file, 'team-logos');

  const team = await prisma.team.create({
    data: {
      ...body,
      logoUrl,
      ownerId: req.user!.id,
      members: { create: { userId: req.user!.id } },
    },
    include: { members: { include: { user: { select: { username: true, avatarUrl: true } } } } },
  });

  res.status(201).json(team);
};

export const getTeam = async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { username: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, username: true, name: true, avatarUrl: true, contributorScore: true } } } },
      _count: { select: { gigs: true } },
    },
  });
  if (!team) throw new AppError('Team not found', 404);
  res.json(team);
};

export const addTeamMember = async (req: Request, res: Response) => {
  const { username } = z.object({ username: z.string() }).parse(req.body);

  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) throw new AppError('Team not found', 404);
  if (team.ownerId !== req.user!.id) throw new AppError('Only team owner can add members', 403);

  const userToAdd = await prisma.user.findUnique({ where: { username } });
  if (!userToAdd) throw new AppError('User not found', 404);

  const member = await prisma.teamMember.create({
    data: { teamId: req.params.id, userId: userToAdd.id },
    include: { user: { select: { username: true, avatarUrl: true } } },
  });

  res.status(201).json(member);
};

export const removeTeamMember = async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({ where: { id: req.params.id } });
  if (!team) throw new AppError('Team not found', 404);
  if (team.ownerId !== req.user!.id) throw new AppError('Only team owner can remove members', 403);
  if (req.params.userId === team.ownerId) throw new AppError('Cannot remove team owner', 400);

  await prisma.teamMember.deleteMany({
    where: { teamId: req.params.id, userId: req.params.userId },
  });

  res.json({ message: 'Member removed' });
};
