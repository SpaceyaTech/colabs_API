import { Router } from 'express';
import { createTeam, getTeam, addTeamMember, removeTeamMember } from './teams.controller';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../lib/minio';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Teams
 *   description: Team creation and membership management
 */

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Create a team
 *     tags: [Teams]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Team created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, upload.single('logo'), createTeam);

/**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: Get team detail
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team detail with members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Team'
 *       404:
 *         description: Team not found
 */
router.get('/:id', getTeam);

/**
 * @swagger
 * /api/teams/{id}/members:
 *   post:
 *     summary: Add a member to a team (owner only)
 *     tags: [Teams]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Member added
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the team owner
 */
router.post('/:id/members', authenticate, addTeamMember);

/**
 * @swagger
 * /api/teams/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a member from a team (owner only)
 *     tags: [Teams]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Member removed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the team owner
 */
router.delete('/:id/members/:userId', authenticate, removeTeamMember);

export default router;
