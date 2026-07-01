import { Router } from 'express';
import {
  submitCollaborationRequest,
  getCollaborationRequestsForProject,
  getMyCollaborationRequests,
} from './collaborations.controller';
import { authenticate } from '../../middleware/auth';

const projectCollaborationRouter = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Collaborations
 *   description: Collaboration requests submitted on repositories
 */

/**
 * @swagger
 * /api/projects/{projectId}/collaboration-requests:
 *   post:
 *     summary: Submit a collaboration request on a project
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - skills
 *               - experienceLevel
 *             properties:
 *               message:
 *                 type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               experienceLevel:
 *                 type: string
 *                 enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *     responses:
 *       201:
 *         description: Collaboration request submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollaborationRequest'
 *       400:
 *         description: Cannot request collaboration on your own project
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Project not found
 *       409:
 *         description: A collaboration request already exists for this project
 */
projectCollaborationRouter.post('/', authenticate, submitCollaborationRequest);

/**
 * @swagger
 * /api/projects/{projectId}/collaboration-requests:
 *   get:
 *     summary: View collaboration requests for a project (project owner only)
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of collaboration requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CollaborationRequest'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the project owner
 *       404:
 *         description: Project not found
 */
projectCollaborationRouter.get('/', authenticate, getCollaborationRequestsForProject);

const myCollaborationRouter = Router();

/**
 * @swagger
 * /api/collaboration-requests/mine:
 *   get:
 *     summary: View your own submitted collaboration requests
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of your collaboration requests
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CollaborationRequest'
 *       401:
 *         description: Not authenticated
 */
myCollaborationRouter.get('/mine', authenticate, getMyCollaborationRequests);

export { projectCollaborationRouter, myCollaborationRouter };
