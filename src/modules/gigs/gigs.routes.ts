import { Router } from 'express';
import { listGigs, createGig, getGig, updateGig, deleteGig } from './gigs.controller';
import { authenticate } from '../../middleware/auth';
import { upload } from '../../lib/minio';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Gigs
 *   description: Freelance gig listings
 */

/**
 * @swagger
 * /api/gigs:
 *   get:
 *     summary: Browse gigs
 *     tags: [Gigs]
 *     parameters:
 *       - in: query
 *         name: skill
 *         schema:
 *           type: string
 *         description: Filter by required skill
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of gigs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Gig'
 */
router.get('/', listGigs);

/**
 * @swagger
 * /api/gigs:
 *   post:
 *     summary: Post a new gig
 *     tags: [Gigs]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - budget
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Gig created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gig'
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, upload.array('attachments', 5), createGig);

/**
 * @swagger
 * /api/gigs/{id}:
 *   get:
 *     summary: Get gig detail
 *     tags: [Gigs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gig detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gig'
 *       404:
 *         description: Gig not found
 */
router.get('/:id', getGig);

/**
 * @swagger
 * /api/gigs/{id}:
 *   put:
 *     summary: Update a gig (owner only)
 *     tags: [Gigs]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, COMPLETED, CANCELLED]
 *     responses:
 *       200:
 *         description: Updated gig
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the gig owner
 */
router.put('/:id', authenticate, updateGig);

/**
 * @swagger
 * /api/gigs/{id}:
 *   delete:
 *     summary: Delete a gig (owner only)
 *     tags: [Gigs]
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
 *         description: Gig deleted
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the gig owner
 */
router.delete('/:id', authenticate, deleteGig);

export default router;
