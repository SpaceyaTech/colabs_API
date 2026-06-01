import { Router } from 'express';
import { getUserByUsername, updateProfile, getUserContributionStats } from './users.controller';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../lib/minio';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profiles and contribution stats
 */

/**
 * @swagger
 * /api/users/{username}:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         example: spaceyatech
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:username', getUserByUsername);

/**
 * @swagger
 * /api/users/{username}/contributions:
 *   get:
 *     summary: Get GitHub contribution stats for a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Contribution statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalContributions:
 *                   type: integer
 *                 weeks:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/:username/contributions', getUserContributionStats);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update own profile
 *     tags: [Users]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               bio:
 *                 type: string
 *               location:
 *                 type: string
 *               websiteUrl:
 *                 type: string
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Updated user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 */
router.put('/me', authenticate, upload.single('avatar'), updateProfile);

export default router;
