import { Router } from 'express';
import { getDashboardStats } from './dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: User dashboard analytics
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get user dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 myIssues:
 *                   type: object
 *                   properties:
 *                     totalClaimed: { type: integer }
 *                     activeClaims: { type: integer }
 *                     recentClaims:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           issueId: { type: string }
 *                           title: { type: string }
 *                           status: { type: string }
 *                           projectName: { type: string }
 *                           claimedAt: { type: string, format: date-time }
 *                 contributedProjects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string }
 *                       logoUrl: { type: string }
 *                       githubRepoUrl: { type: string }
 *                 weeklyActivity:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       weekStart: { type: string, format: date }
 *                       count: { type: integer }
 *                 heatmap:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date: { type: string, format: date }
 *                       count: { type: integer }
 */
router.get('/stats', authenticate, getDashboardStats);

export default router;
