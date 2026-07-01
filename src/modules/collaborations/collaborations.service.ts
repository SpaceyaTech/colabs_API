import { CollaborationRequestStatus, ExperienceLevel, Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export const ACTIVE_COLLABORATION_STATUSES: CollaborationRequestStatus[] = [
  'PENDING',
  'ACCEPTED',
];

export const createCollaborationRequestSchema = z.object({
  message: z.string().trim().min(20).max(2000),
  skills: z
    .array(z.string().trim().min(1).max(50))
    .min(1)
    .max(20),
  experienceLevel: z.nativeEnum(ExperienceLevel),
});

export const collaborationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(CollaborationRequestStatus).optional(),
});

export const updateCollaborationStatusSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
});

export const isUniqueConstraintError = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

export const getProjectForCollaboration = async (projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new AppError('Project not found', 404);
  return project;
};

export const findActiveCollaborationRequest = (projectId: string, userId: string) =>
  prisma.collaborationRequest.findFirst({
    where: {
      projectId,
      userId,
      status: { in: ACTIVE_COLLABORATION_STATUSES },
    },
  });

export const getCollaborationRequestForProject = async (
  projectId: string,
  requestId: string
) => {
  const request = await prisma.collaborationRequest.findFirst({
    where: { id: requestId, projectId },
  });
  if (!request) throw new AppError('Collaboration request not found', 404);
  return request;
};
