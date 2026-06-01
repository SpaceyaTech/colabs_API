import { Router } from 'express';
import { githubLogin, githubCallback, getMe, logout } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: GitHub OAuth authentication
 */

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Redirect to GitHub OAuth
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to GitHub authorization page
 */
router.get('/github', authLimiter, githubLogin);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth]
 *     description: GitHub redirects here after authorization. Sets a JWT cookie and redirects to the frontend.
 *     responses:
 *       302:
 *         description: Redirects to frontend with auth cookie set
 */
router.get('/github/callback', githubCallback);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, logout);

export default router;
