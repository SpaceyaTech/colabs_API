import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { getRepoInfo, getRepoIssues, parseRepoUrl } from '../../lib/github';
import { uploadFile } from '../../lib/minio';

const createProjectSchema = z.object({
  githubRepoUrl: z.string().url().includes('github.com'),
});

export const listProjects = async (req: Request, res: Response) => {
  const { page = '1', limit = '20', language, search } = req.query as Record<string, string>;

  const where: any = {};
  if (language) where.language = language;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        owner: { select: { username: true, avatarUrl: true } },
        _count: { select: { issues: true } },
      },
      orderBy: { stars: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.project.count({ where }),
  ]);

  res.json({ projects, total, page: parseInt(page), limit: parseInt(limit) });
};

export const createProject = async (req: Request, res: Response) => {
  const { githubRepoUrl } = createProjectSchema.parse(req.body);
  const parsed = parseRepoUrl(githubRepoUrl);
  if (!parsed) throw new AppError('Invalid GitHub repo URL', 400);

  const existing = await prisma.project.findUnique({ where: { githubRepoUrl } });
  if (existing) throw new AppError('Project already registered', 409);

  const repoData = await getRepoInfo(parsed.owner, parsed.repo);

  let logoUrl: string | undefined;
  if (req.file) logoUrl = await uploadFile(req.file, 'project-logos');

  const project = await prisma.project.create({
    data: {
      githubRepoUrl,
      name: repoData.full_name,
      description: repoData.description,
      language: repoData.language,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      topics: repoData.topics || [],
      logoUrl,
      ownerId: req.user!.id,
    },
  });

  res.status(201).json(project);
};

export const getProject = async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { username: true, name: true, avatarUrl: true } },
      issues: { where: { status: 'OPEN' }, take: 10, orderBy: { createdAt: 'desc' } },
      _count: { select: { issues: true } },
    },
  });
  if (!project) throw new AppError('Project not found', 404);
  res.json(project);
};

export const syncProjectIssues = async (req: Request, res: Response) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) throw new AppError('Project not found', 404);

  const parsed = parseRepoUrl(project.githubRepoUrl);
  if (!parsed) throw new AppError('Could not parse repo URL', 400);

  const ghIssues = await getRepoIssues(parsed.owner, parsed.repo);

  const upserts = ghIssues.map((issue: any) =>
    prisma.issue.upsert({
      where: { projectId_githubIssueId: { projectId: project.id, githubIssueId: issue.number } },
      update: { title: issue.title, body: issue.body, labels: issue.labels.map((l: any) => l.name) },
      create: {
        githubIssueId: issue.number,
        title: issue.title,
        body: issue.body,
        url: issue.html_url,
        labels: issue.labels.map((l: any) => l.name),
        projectId: project.id,
      },
    })
  );

  await Promise.all(upserts);
  res.json({ synced: upserts.length });
};
