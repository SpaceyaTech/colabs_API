import { Request, Response } from 'express';
import { z } from 'zod';
import {
  buildGitHubConnectUrl,
  connectGitHubIntegration,
  disconnectGitHubIntegration,
  getGitHubIntegration,
} from './githubIntegration.service';

const githubCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const getGitHubIntegrationStatus = async (req: Request, res: Response) => {
  const result = await getGitHubIntegration(req.user!.id);
  res.json(result);
};

export const createGitHubConnectUrl = async (req: Request, res: Response) => {
  res.json({ authorizationUrl: buildGitHubConnectUrl(req.user!.id) });
};

export const handleGitHubIntegrationCallback = async (req: Request, res: Response) => {
  const { code, state } = githubCallbackSchema.parse(req.query);
  const result = await connectGitHubIntegration(req.user!.id, code, state);
  res.json(result);
};

export const deleteGitHubIntegration = async (req: Request, res: Response) => {
  await disconnectGitHubIntegration(req.user!.id);
  res.json({ message: 'GitHub integration disconnected successfully' });
};
