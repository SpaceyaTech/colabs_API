import { Router } from 'express';
import {
  submitCollaborationRequest,
  getCollaborationRequestsForProject,
  getMyCollaborationRequests,
  acceptCollaborationRequest,
  rejectCollaborationRequest,
  withdrawCollaborationRequest,
} from './collaborations.controller';
import { authenticate, requireVerifiedEmail } from '../../middleware/auth';

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
 *                 minLength: 20
 *               skills:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 20
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
 *       403:
 *         description: Email not verified
 *       404:
 *         description: Project not found
 *       409:
 *         description: An active collaboration request already exists for this project
 */
projectCollaborationRouter.post(
  '/',
  authenticate,
  requireVerifiedEmail,
  submitCollaborationRequest
);

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
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, WITHDRAWN]
 *     responses:
 *       200:
 *         description: Paginated list of collaboration requests
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the project owner
 *       404:
 *         description: Project not found
 */
projectCollaborationRouter.get(
  '/',
  authenticate,
  requireVerifiedEmail,
  getCollaborationRequestsForProject
);

/**
 * @swagger
 * /api/projects/{projectId}/collaboration-requests/{requestId}/accept:
 *   post:
 *     summary: Accept a collaboration request (project owner only)
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collaboration request accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollaborationRequest'
 *       400:
 *         description: Request is not pending
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the project owner
 *       404:
 *         description: Project or request not found
 */
projectCollaborationRouter.post(
  '/:requestId/accept',
  authenticate,
  requireVerifiedEmail,
  acceptCollaborationRequest
);

/**
 * @swagger
 * /api/projects/{projectId}/collaboration-requests/{requestId}/reject:
 *   post:
 *     summary: Reject a collaboration request (project owner only)
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collaboration request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CollaborationRequest'
 *       400:
 *         description: Request is not pending
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the project owner
 *       404:
 *         description: Project or request not found
 */
projectCollaborationRouter.post(
  '/:requestId/reject',
  authenticate,
  requireVerifiedEmail,
  rejectCollaborationRequest
);

const myCollaborationRouter = Router();

/**
 * @swagger
 * /api/collaboration-requests/mine:
 *   get:
 *     summary: View your own submitted collaboration requests
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED, WITHDRAWN]
 *     responses:
 *       200:
 *         description: Paginated list of your collaboration requests
 *       401:
 *         description: Not authenticated
 */
myCollaborationRouter.get(
  '/mine',
  authenticate,
  requireVerifiedEmail,
  getMyCollaborationRequests
);

/**
 * @swagger
 * /api/collaboration-requests/{requestId}:
 *   delete:
 *     summary: Withdraw your pending collaboration request
 *     tags: [Collaborations]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collaboration request withdrawn
 *       400:
 *         description: Request is not pending
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the request owner
 *       404:
 *         description: Request not found
 */
myCollaborationRouter.delete(
  '/:requestId',
  authenticate,
  requireVerifiedEmail,
  withdrawCollaborationRequest
);

export { projectCollaborationRouter, myCollaborationRouter };
