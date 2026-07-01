import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import {
  createGitHubConnectUrl,
  deleteGitHubIntegration,
  getGitHubIntegrationStatus,
} from './integrations.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Integrations
 *   description: Connected third-party accounts for authenticated users
 */

/**
 * @swagger
 * /api/integrations/github:
 *   get:
 *     summary: Get current user's GitHub integration status
 *     tags: [Integrations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GitHub integration status without access token data
 *       401:
 *         description: Not authenticated
 */
router.get('/github', authenticate, getGitHubIntegrationStatus);

/**
 * @swagger
 * /api/integrations/github/connect:
 *   post:
 *     summary: Start GitHub account connection flow
 *     description: Returns a GitHub authorization URL for the authenticated user. GitHub redirects to the shared auth callback, where signed state tells the server to connect an integration instead of logging in.
 *     tags: [Integrations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorizationUrl:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
router.post('/github/connect', authenticate, createGitHubConnectUrl);

/**
 * @swagger
 * /api/integrations/github:
 *   delete:
 *     summary: Disconnect current user's GitHub integration
 *     tags: [Integrations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: GitHub integration disconnected
 *       401:
 *         description: Not authenticated
 */
router.delete('/github', authenticate, deleteGitHubIntegration);

export default router;
