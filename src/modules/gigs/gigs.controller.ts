import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { uploadFile } from '../../lib/minio';

const createGigSchema = z.object({
  title: z.string().min(5).max(150),
  description: z.string().min(20).max(5000),
  budget: z.coerce.number().positive(),
  currency: z.string().default('USD'),
  skills: z.array(z.string()).min(1).max(10),
  deadline: z.string().datetime().optional(),
});

const updateGigSchema = createGigSchema.partial().extend({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const listGigs = async (req: Request, res: Response) => {
  const { page = '1', limit = '20', skill, status = 'OPEN', search } = req.query as Record<string, string>;

  const where: any = { status };
  if (skill) where.skills = { has: skill };
  if (search) where.title = { contains: search, mode: 'insensitive' };

  const [gigs, total] = await Promise.all([
    prisma.gig.findMany({
      where,
      include: {
        client: { select: { username: true, name: true, avatarUrl: true } },
        _count: { select: { proposals: true } },
      },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.gig.count({ where }),
  ]);

  res.json({ gigs, total, page: parseInt(page), limit: parseInt(limit) });
};

export const createGig = async (req: Request, res: Response) => {
  const body = createGigSchema.parse(
    typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body
  );

  const attachments: string[] = [];
  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      const url = await uploadFile(file, 'gig-attachments');
      attachments.push(url);
    }
  }

  const gig = await prisma.gig.create({
    data: {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      attachments,
      clientId: req.user!.id,
    },
  });

  res.status(201).json(gig);
};

export const getGig = async (req: Request, res: Response) => {
  const gig = await prisma.gig.findUnique({
    where: { id: req.params.id },
    include: {
      client: { select: { username: true, name: true, avatarUrl: true } },
      _count: { select: { proposals: true } },
    },
  });
  if (!gig) throw new AppError('Gig not found', 404);
  res.json(gig);
};

export const updateGig = async (req: Request, res: Response) => {
  const gig = await prisma.gig.findUnique({ where: { id: req.params.id } });
  if (!gig) throw new AppError('Gig not found', 404);
  if (gig.clientId !== req.user!.id) throw new AppError('Not authorized', 403);

  const body = updateGigSchema.parse(req.body);
  const updated = await prisma.gig.update({
    where: { id: req.params.id },
    data: { ...body, deadline: body.deadline ? new Date(body.deadline) : undefined },
  });
  res.json(updated);
};

export const deleteGig = async (req: Request, res: Response) => {
  const gig = await prisma.gig.findUnique({ where: { id: req.params.id } });
  if (!gig) throw new AppError('Gig not found', 404);
  if (gig.clientId !== req.user!.id) throw new AppError('Not authorized', 403);

  await prisma.gig.delete({ where: { id: req.params.id } });
  res.json({ message: 'Gig deleted' });
};
