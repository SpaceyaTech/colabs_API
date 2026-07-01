import { Request, Response } from 'express';
import {
  buildGitHubConnectUrl,
  disconnectGitHubIntegration,
  getGitHubIntegration,
} from './githubIntegration.service';

export const getGitHubIntegrationStatus = async (req: Request, res: Response) => {
  const result = await getGitHubIntegration(req.user!.id);
  res.json(result);
};

export const createGitHubConnectUrl = async (req: Request, res: Response) => {
  res.json({ authorizationUrl: buildGitHubConnectUrl(req.user!.id) });
};

export const deleteGitHubIntegration = async (req: Request, res: Response) => {
  await disconnectGitHubIntegration(req.user!.id);
  res.json({ message: 'GitHub integration disconnected successfully' });
};
