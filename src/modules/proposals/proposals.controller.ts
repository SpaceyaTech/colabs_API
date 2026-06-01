import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const createProposalSchema = z.object({
  coverLetter: z.string().min(50).max(2000),
  bidAmount: z.coerce.number().positive(),
  currency: z.string().default('USD'),
  deliveryDays: z.coerce.number().int().positive(),
});

export const getProposalsForGig = async (req: Request, res: Response) => {
  const gig = await prisma.gig.findUnique({ where: { id: req.params.gigId } });
  if (!gig) throw new AppError('Gig not found', 404);
  if (gig.clientId !== req.user!.id) throw new AppError('Not authorized', 403);

  const proposals = await prisma.proposal.findMany({
    where: { gigId: req.params.gigId },
    include: {
      user: { select: { username: true, name: true, avatarUrl: true, contributorScore: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(proposals);
};

export const submitProposal = async (req: Request, res: Response) => {
  const gig = await prisma.gig.findUnique({ where: { id: req.params.gigId } });
  if (!gig) throw new AppError('Gig not found', 404);
  if (gig.status !== 'OPEN') throw new AppError('This gig is not accepting proposals', 400);
  if (gig.clientId === req.user!.id) throw new AppError('Cannot propose on your own gig', 400);

  const existing = await prisma.proposal.findUnique({
    where: { gigId_userId: { gigId: req.params.gigId, userId: req.user!.id } },
  });
  if (existing) throw new AppError('You already submitted a proposal', 409);

  const body = createProposalSchema.parse(req.body);
  const proposal = await prisma.proposal.create({
    data: { ...body, gigId: req.params.gigId, userId: req.user!.id },
  });
  res.status(201).json(proposal);
};

export const updateProposalStatus = async (req: Request, res: Response) => {
  const { status } = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED']),
  }).parse(req.body);

  const proposal = await prisma.proposal.findUnique({
    where: { id: req.params.proposalId },
    include: { gig: true },
  });
  if (!proposal) throw new AppError('Proposal not found', 404);
  if (proposal.gig.clientId !== req.user!.id) throw new AppError('Not authorized', 403);

  const updated = await prisma.proposal.update({
    where: { id: req.params.proposalId },
    data: { status },
  });

  if (status === 'ACCEPTED') {
    await prisma.gig.update({
      where: { id: proposal.gigId },
      data: { status: 'IN_PROGRESS' },
    });
  }

  res.json(updated);
};

export const withdrawProposal = async (req: Request, res: Response) => {
  const proposal = await prisma.proposal.findUnique({ where: { id: req.params.proposalId } });
  if (!proposal) throw new AppError('Proposal not found', 404);
  if (proposal.userId !== req.user!.id) throw new AppError('Not authorized', 403);

  await prisma.proposal.update({
    where: { id: req.params.proposalId },
    data: { status: 'WITHDRAWN' },
  });
  res.json({ message: 'Proposal withdrawn' });
};
