import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { fetchGitHubContributionCalendar } from '../../lib/github';
import { AppError } from '../../middleware/errorHandler';

export const getDashboardStats = async (req: Request, res: Response) => {
  const userId = req.user!.id;

  // 1. Get user for GitHub username
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  if (!user) throw new AppError('User not found', 404);

  // 2. Get all issue claims for the user
  const claims = await prisma.issueClaim.findMany({
    where: { userId },
    include: {
      issue: {
        include: {
          project: true,
        },
      },
    },
    orderBy: { claimedAt: 'desc' },
  });

  // 3. "My Issues" overview
  const activeClaims = claims.filter(c => c.issue.status !== 'CLOSED').length;
  const recentClaims = claims.slice(0, 5).map(c => ({
    issueId: c.issueId,
    title: c.issue.title,
    status: c.issue.status,
    projectName: c.issue.project.name,
    claimedAt: c.claimedAt,
  }));

  // 4. Projects Contributed
  const projectIds = [...new Set(claims.map(c => c.issue.projectId))];
  const contributedProjects = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      githubRepoUrl: true,
    },
  });

  // 5. Weekly Activity Chart (last 21 days)
  const activityCounts: Record<string, number> = {};
  const twentyOneDaysAgo = new Date();
  twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21);

  claims.forEach(c => {
    if (c.claimedAt >= twentyOneDaysAgo) {
      const dateStr = c.claimedAt.toISOString().split('T')[0];
      activityCounts[dateStr] = (activityCounts[dateStr] || 0) + 1;
    }
  });

  // Format into weeks (last 3 weeks)
  const weeklyActivity = [];
  for (let i = 2; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + 6));
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (i * 7));

    let weekCount = 0;
    const curr = new Date(weekStart);
    while (curr <= weekEnd) {
      weekCount += activityCounts[curr.toISOString().split('T')[0]] || 0;
      curr.setDate(curr.getDate() + 1);
    }

    weeklyActivity.push({
      weekStart: weekStart.toISOString().split('T')[0],
      count: weekCount,
    });
  }

  // 6. Contribution Heatmap (DB + GitHub)
  const ghCalendar = await fetchGitHubContributionCalendar(user.username);
  const heatmap: Record<string, number> = {};

  // Add GitHub data
  ghCalendar.forEach(item => {
    heatmap[item.date] = item.count;
  });

  // Merge DB activity
  claims.forEach(c => {
    const dateStr = c.claimedAt.toISOString().split('T')[0];
    heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;
  });

  res.json({
    myIssues: {
      totalClaimed: claims.length,
      activeClaims,
      recentClaims,
    },
    contributedProjects,
    weeklyActivity,
    heatmap: Object.entries(heatmap).map(([date, count]) => ({ date, count })),
  });
};
