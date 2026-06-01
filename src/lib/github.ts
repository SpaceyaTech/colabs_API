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

export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
};
