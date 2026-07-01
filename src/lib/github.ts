import axios from 'axios';
import { env } from '../config/env';
import { cacheGet, cacheSet } from './redis';

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github+json',
    ...(env.GITHUB_API_TOKEN
      ? { Authorization: `Bearer ${env.GITHUB_API_TOKEN}` }
      : {}),
  },
});

export const getRepoInfo = async (owner: string, repo: string) => {
  const cacheKey = `github:repo:${owner}/${repo}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { data } = await githubApi.get(`/repos/${owner}/${repo}`);
  await cacheSet(cacheKey, data, 300); // cache 5 min
  return data;
};

export const getRepoIssues = async (owner: string, repo: string, page = 1) => {
  const cacheKey = `github:issues:${owner}/${repo}:${page}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { data } = await githubApi.get(
    `/repos/${owner}/${repo}/issues?state=open&per_page=30&page=${page}&labels=good+first+issue,help+wanted`
  );
  await cacheSet(cacheKey, data, 300);
  return data;
};

export const getUserContributions = async (username: string) => {
  const cacheKey = `github:contributions:${username}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { data } = await githubApi.get(`/users/${username}`);
  await cacheSet(cacheKey, data, 600); // 10 min
  return data;
};

type ContributionDay = { date: string; count: number };

export const fetchGitHubContributionCalendar = async (
  username: string
): Promise<ContributionDay[]> => {
  const cacheKey = `github:calendar:${username}`;
  const cached = await cacheGet<ContributionDay[]>(cacheKey);
  if (cached) return cached;

  if (!env.GITHUB_API_TOKEN) {
    console.warn(`GITHUB_API_TOKEN not set — skipping heatmap for ${username}`);
    return [];
  }

  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  try {
    const { data } = await githubApi.post('/graphql', {
      query,
      variables: { username },
    });

    if (data.errors?.length) {
      console.warn(`GitHub GraphQL errors for ${username}:`, data.errors);
      return [];
    }

    const weeks =
      data.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];

    const formattedData: ContributionDay[] = weeks.flatMap((week: { contributionDays: { date: string; contributionCount: number }[] }) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
      }))
    );

    await cacheSet(cacheKey, formattedData, 3600); // cache 1 hour
    return formattedData;
  } catch (err) {
    console.error(`Failed to fetch GitHub contribution calendar for ${username}:`, err);
    return [];
  }
};

export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
};

type GitHubUserRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  private: boolean;
};

export const listUserRepositories = async (
  accessToken: string,
  options: {
    page?: number;
    perPage?: number;
    type?: 'all' | 'owner' | 'public' | 'private' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  } = {}
) => {
  const { page = 1, perPage = 30, type = 'owner', sort = 'updated' } = options;

  const { data } = await axios.get<GitHubUserRepo[]>('/user/repos', {
    baseURL: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      page,
      per_page: Math.min(perPage, 100),
      type,
      sort,
    },
  });

  return data;
};
