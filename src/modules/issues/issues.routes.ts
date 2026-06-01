import { Router } from 'express';
import { listIssues, claimIssue, unclaimIssue } from './issues.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Issues
 *   description: Open-source issues available for contributors to claim
 */

/**
 * @swagger
 * /api/issues:
 *   get:
 *     summary: Browse open issues
 *     tags: [Issues]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filter by project
 *       - in: query
 *         name: label
 *         schema:
 *           type: string
 *         description: Filter by label e.g. good-first-issue
 *     responses:
 *       200:
 *         description: List of issues
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Issue'
 */
router.get('/', listIssues);

/**
 * @swagger
 * /api/issues/{id}/claim:
 *   post:
 *     summary: Claim an issue
 *     tags: [Issues]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue claimed successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Issue not found
 *   delete:
 *     summary: Unclaim an issue
 *     tags: [Issues]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue unclaimed successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/:id/claim', authenticate, claimIssue);
router.delete('/:id/claim', authenticate, unclaimIssue);

export default router;
