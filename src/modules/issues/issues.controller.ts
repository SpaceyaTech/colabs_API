import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

export const listIssues = async (req: Request, res: Response) => {
  const { projectId, label, page = '1', limit = '20' } = req.query as Record<string, string>;

  const where: any = { status: 'OPEN' };
  if (projectId) where.projectId = projectId;
  if (label) where.labels = { has: label };

  const issues = await prisma.issue.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, logoUrl: true } },
      _count: { select: { claims: true } },
    },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
    orderBy: { createdAt: 'desc' },
  });

  res.json(issues);
};

export const claimIssue = async (req: Request, res: Response) => {
  const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });
  if (!issue) throw new AppError('Issue not found', 404);
  if (issue.status !== 'OPEN') throw new AppError('Issue is not available to claim', 400);

  const existingClaim = await prisma.issueClaim.findFirst({
    where: { issueId: req.params.id, userId: req.user!.id },
  });
  if (existingClaim) throw new AppError('You already claimed this issue', 409);

  const claim = await prisma.issueClaim.create({
    data: { userId: req.user!.id, issueId: req.params.id },
  });

  await prisma.issue.update({ where: { id: req.params.id }, data: { status: 'CLAIMED' } });

  res.status(201).json(claim);
};

export const unclaimIssue = async (req: Request, res: Response) => {
  const claim = await prisma.issueClaim.findFirst({
    where: { issueId: req.params.id, userId: req.user!.id },
  });
  if (!claim) throw new AppError('No claim found', 404);

  await prisma.issueClaim.delete({ where: { id: claim.id } });
  await prisma.issue.update({ where: { id: req.params.id }, data: { status: 'OPEN' } });

  res.json({ message: 'Issue unclaimed' });
};
