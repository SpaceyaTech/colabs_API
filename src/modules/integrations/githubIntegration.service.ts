import axios from 'axios';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/errorHandler';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_SCOPE = 'read:user user:email public_repo';
const STATE_TTL = '10m';

type GitHubIntegrationState = {
  userId: string;
  purpose: 'github_integration';
};

type GitHubTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type GitHubUserResponse = {
  id: number;
  login: string;
  html_url?: string;
  avatar_url?: string;
};

const tokenKey = () => crypto.createHash('sha256').update(env.JWT_SECRET).digest();

const encryptAccessToken = (token: string) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);

  return {
    accessToken: encrypted.toString('base64'),
    accessTokenIv: iv.toString('base64'),
    accessTokenTag: cipher.getAuthTag().toString('base64'),
  };
};

export const decryptAccessToken = (integration: {
  accessToken: string;
  accessTokenIv: string;
  accessTokenTag: string;
}) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    tokenKey(),
    Buffer.from(integration.accessTokenIv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(integration.accessTokenTag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(integration.accessToken, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

export const getUserGitHubAccessToken = async (userId: string) => {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw new AppError(
      'Connect your GitHub account before listing repositories',
      400
    );
  }

  return decryptAccessToken(integration);
};

const issueState = (userId: string) =>
  jwt.sign(
    { userId, purpose: 'github_integration' },
    env.JWT_SECRET,
    { expiresIn: STATE_TTL } as SignOptions
  );

const verifyState = (state: string): GitHubIntegrationState => {
  try {
    const decoded = jwt.verify(state, env.JWT_SECRET) as GitHubIntegrationState;
    if (decoded.purpose !== 'github_integration' || !decoded.userId) {
      throw new Error('Invalid integration state');
    }
    return decoded;
  } catch {
    throw new AppError('Invalid or expired GitHub integration state', 400);
  }
};

export const isGitHubIntegrationState = (state: unknown) => {
  if (typeof state !== 'string') return false;
  const decoded = jwt.decode(state) as Partial<GitHubIntegrationState> | null;
  return decoded?.purpose === 'github_integration';
};

export const buildGitHubConnectUrl = (userId: string) => {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: GITHUB_SCOPE,
    state: issueState(userId),
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
};

export const getGitHubIntegration = async (userId: string) => {
  const integration = await prisma.gitHubIntegration.findUnique({
    where: { userId },
    select: {
      githubUserId: true,
      githubUsername: true,
      profileUrl: true,
      avatarUrl: true,
      scope: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  return integration
    ? { connected: true, integration }
    : { connected: false, integration: null };
};

export const connectGitHubIntegration = async (
  userId: string,
  code: string,
  state: string
) => {
  const decodedState = verifyState(state);
  if (decodedState.userId !== userId) {
    throw new AppError('GitHub integration state does not match the authenticated user', 403);
  }

  const { data: tokenData } = await axios.post<GitHubTokenResponse>(
    GITHUB_TOKEN_URL,
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL,
    },
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (tokenData.error || !tokenData.access_token) {
    throw new AppError(
      tokenData.error_description || 'GitHub OAuth token exchange failed',
      400
    );
  }

  const { data: githubUser } = await axios.get<GitHubUserResponse>(GITHUB_USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  const existingIntegration = await prisma.gitHubIntegration.findUnique({
    where: { githubUserId: String(githubUser.id) },
    select: { userId: true },
  });

  if (existingIntegration && existingIntegration.userId !== userId) {
    throw new AppError('This GitHub account is already connected to another user', 409);
  }

  const encryptedToken = encryptAccessToken(tokenData.access_token);

  const integration = await prisma.gitHubIntegration.upsert({
    where: { userId },
    update: {
      githubUserId: String(githubUser.id),
      githubUsername: githubUser.login,
      profileUrl: githubUser.html_url,
      avatarUrl: githubUser.avatar_url,
      scope: tokenData.scope,
      tokenType: tokenData.token_type || 'bearer',
      ...encryptedToken,
    },
    create: {
      userId,
      githubUserId: String(githubUser.id),
      githubUsername: githubUser.login,
      profileUrl: githubUser.html_url,
      avatarUrl: githubUser.avatar_url,
      scope: tokenData.scope,
      tokenType: tokenData.token_type || 'bearer',
      ...encryptedToken,
    },
    select: {
      githubUserId: true,
      githubUsername: true,
      profileUrl: true,
      avatarUrl: true,
      scope: true,
      connectedAt: true,
      updatedAt: true,
    },
  });

  return { connected: true, integration };
};

export const disconnectGitHubIntegration = async (userId: string) => {
  await prisma.gitHubIntegration.deleteMany({ where: { userId } });
};
