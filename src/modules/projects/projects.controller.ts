import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';
import { getRepoInfo, getRepoIssues, listUserRepositories, parseRepoUrl } from '../../lib/github';
import { getUserGitHubAccessToken } from '../integrations/githubIntegration.service';
import { uploadFile } from '../../lib/minio';

const createProjectSchema = z.object({
  githubRepoUrl: z.string().url().includes('github.com'),
});

const githubReposQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(30),
  type: z.enum(['all', 'owner', 'public', 'private', 'member']).default('owner'),
  sort: z.enum(['created', 'updated', 'pushed', 'full_name']).default('updated'),
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

export const listGitHubReposForProject = async (req: Request, res: Response) => {
  const query = githubReposQuerySchema.parse(req.query);
  const accessToken = await getUserGitHubAccessToken(req.user!.id);

  let repos;
  try {
    repos = await listUserRepositories(accessToken, query);
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      throw new AppError('GitHub token expired. Reconnect your GitHub account.', 401);
    }
    if (status === 403) {
      throw new AppError(
        'GitHub token cannot list repositories. Reconnect with repo access.',
        403
      );
    }
    throw err;
  }

  const repoUrls = repos.map((repo) => repo.html_url);
  const registeredProjects = repoUrls.length
    ? await prisma.project.findMany({
        where: { githubRepoUrl: { in: repoUrls } },
        select: { githubRepoUrl: true },
      })
    : [];

  const registeredUrls = new Set(registeredProjects.map((project) => project.githubRepoUrl));

  res.json({
    repositories: repos.map((repo) => ({
      githubRepoUrl: repo.html_url,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      topics: repo.topics ?? [],
      isPrivate: repo.private,
      isRegistered: registeredUrls.has(repo.html_url),
    })),
    page: query.page,
    perPage: query.perPage,
  });
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
