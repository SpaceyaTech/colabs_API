import { Router } from 'express';
import { listProjects, createProject, getProject, syncProjectIssues } from './projects.controller';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../lib/minio';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Projects
 *   description: Open-source project registration and management
 */

/**
 * @swagger
 * /api/projects:
 *   get:
 *     summary: List all projects
 *     tags: [Projects]
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: Filter by programming language
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or description
 *     responses:
 *       200:
 *         description: List of projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Project'
 */
router.get('/', listProjects);

/**
 * @swagger
 * /api/projects:
 *   post:
 *     summary: Register a GitHub repo as a project
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - githubRepoUrl
 *             properties:
 *               githubRepoUrl:
 *                 type: string
 *                 example: https://github.com/SpaceyaTech/CoLabs
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Project created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, upload.single('logo'), createProject);

/**
 * @swagger
 * /api/projects/{id}:
 *   get:
 *     summary: Get project detail
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 */
router.get('/:id', getProject);

/**
 * @swagger
 * /api/projects/{id}/sync-issues:
 *   post:
 *     summary: Sync open issues from GitHub
 *     tags: [Projects]
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
 *         description: Issues synced successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Project not found
 */
router.post('/:id/sync-issues', authenticate, syncProjectIssues);

export default router;
