import { Router } from 'express';
import { listProjects, createProject, getProject, syncProjectIssues, listGitHubReposForProject } from './projects.controller';
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
 * /api/projects/github-repos:
 *   get:
 *     summary: List GitHub repositories for project creation
 *     description: Returns repositories from the authenticated user's connected GitHub account. Use githubRepoUrl when creating a project.
 *     tags: [Projects]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 30
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, owner, public, private, member]
 *           default: owner
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, pushed, full_name]
 *           default: updated
 *     responses:
 *       200:
 *         description: GitHub repositories available for registration
 *       400:
 *         description: GitHub account not connected
 *       401:
 *         description: Not authenticated or GitHub token expired
 */
router.get('/github-repos', authenticate, listGitHubReposForProject);

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
