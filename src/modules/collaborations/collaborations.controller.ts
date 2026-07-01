import { Request, Response } from 'express';
import { CollaborationRequestStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import {
  collaborationListQuerySchema,
  createCollaborationRequestSchema,
  findActiveCollaborationRequest,
  getProjectForCollaboration,
  isUniqueConstraintError,
  resolveCollaborationRequest,
} from './collaborations.service';

export const submitCollaborationRequest = async (req: Request, res: Response) => {
  const project = await getProjectForCollaboration(req.params.projectId);
  if (project.ownerId === req.user!.id) {
    throw new AppError('Cannot request collaboration on your own project', 400);
  }

  const body = createCollaborationRequestSchema.parse(req.body);

  const existing = await findActiveCollaborationRequest(project.id, req.user!.id);
  if (existing) {
    throw new AppError('You already have an active collaboration request for this project', 409);
  }

  try {
    const collaborationRequest = await prisma.collaborationRequest.create({
      data: {
        ...body,
        skills: body.skills.map((skill) => skill.trim()),
        projectId: project.id,
        userId: req.user!.id,
      },
    });
    res.status(201).json(collaborationRequest);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      throw new AppError('You already have an active collaboration request for this project', 409);
    }
    throw err;
  }
};

export const getMyCollaborationRequests = async (req: Request, res: Response) => {
  const { page, limit, status } = collaborationListQuerySchema.parse(req.query);
  const where = {
    userId: req.user!.id,
    ...(status ? { status } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.collaborationRequest.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, githubRepoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.collaborationRequest.count({ where }),
  ]);

  res.json({ requests, total, page, limit });
};

export const getCollaborationRequestsForProject = async (req: Request, res: Response) => {
  const project = await getProjectForCollaboration(req.params.projectId);
  if (project.ownerId !== req.user!.id) throw new AppError('Not authorized', 403);

  const { page, limit, status } = collaborationListQuerySchema.parse(req.query);
  const where = {
    projectId: project.id,
    ...(status ? { status } : {}),
  };

  const [requests, total] = await Promise.all([
    prisma.collaborationRequest.findMany({
      where,
      include: {
        user: {
          select: { username: true, name: true, avatarUrl: true, contributorScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.collaborationRequest.count({ where }),
  ]);

  res.json({ requests, total, page, limit });
};

export const acceptCollaborationRequest = async (req: Request, res: Response) => {
  const updated = await resolveCollaborationRequest(
    req.params.projectId,
    req.params.requestId,
    req.user!.id,
    CollaborationRequestStatus.ACCEPTED
  );

  res.json(updated);
};

export const rejectCollaborationRequest = async (req: Request, res: Response) => {
  const updated = await resolveCollaborationRequest(
    req.params.projectId,
    req.params.requestId,
    req.user!.id,
    CollaborationRequestStatus.REJECTED
  );

  res.json(updated);
};

export const withdrawCollaborationRequest = async (req: Request, res: Response) => {
  const request = await prisma.collaborationRequest.findUnique({
    where: { id: req.params.requestId },
  });
  if (!request) throw new AppError('Collaboration request not found', 404);
  if (request.userId !== req.user!.id) throw new AppError('Not authorized', 403);
  if (request.status !== CollaborationRequestStatus.PENDING) {
    throw new AppError('Only pending collaboration requests can be withdrawn', 400);
  }

  const updated = await prisma.collaborationRequest.update({
    where: { id: request.id },
    data: { status: CollaborationRequestStatus.WITHDRAWN },
  });

  res.json({ message: 'Collaboration request withdrawn', request: updated });
};
