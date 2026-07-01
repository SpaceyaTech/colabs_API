import { Request, Response } from 'express';
import { z } from 'zod';
import { ExperienceLevel } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const createCollaborationRequestSchema = z.object({
  message: z.string().min(20).max(2000),
  skills: z.array(z.string()).min(1),
  experienceLevel: z.nativeEnum(ExperienceLevel),
});

export const submitCollaborationRequest = async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project) throw new AppError('Project not found', 404);
  if (project.ownerId === req.user!.id) {
    throw new AppError('Cannot request collaboration on your own project', 400);
  }

  const existing = await prisma.collaborationRequest.findUnique({
    where: { projectId_userId: { projectId: req.params.projectId, userId: req.user!.id } },
  });
  if (existing) throw new AppError('You already submitted a collaboration request for this project', 409);

  const body = createCollaborationRequestSchema.parse(req.body);
  const collaborationRequest = await prisma.collaborationRequest.create({
    data: { ...body, projectId: req.params.projectId, userId: req.user!.id },
  });
  res.status(201).json(collaborationRequest);
};

export const getMyCollaborationRequests = async (req: Request, res: Response) => {
  const requests = await prisma.collaborationRequest.findMany({
    where: { userId: req.user!.id },
    include: {
      project: { select: { id: true, name: true, githubRepoUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
};

export const getCollaborationRequestsForProject = async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
  if (!project) throw new AppError('Project not found', 404);
  if (project.ownerId !== req.user!.id) throw new AppError('Not authorized', 403);

  const requests = await prisma.collaborationRequest.findMany({
    where: { projectId: req.params.projectId },
    include: {
      user: { select: { username: true, name: true, avatarUrl: true, contributorScore: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
};
