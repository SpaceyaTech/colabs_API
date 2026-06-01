import { Router } from 'express';
import { getProposalsForGig, submitProposal, updateProposalStatus, withdrawProposal } from './proposals.controller';
import { authenticate } from '../../middleware/auth';

const router = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   name: Proposals
 *   description: Proposals submitted on gigs
 */

/**
 * @swagger
 * /api/gigs/{gigId}/proposals:
 *   get:
 *     summary: View proposals for a gig (gig owner only)
 *     tags: [Proposals]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: gigId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of proposals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Proposal'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the gig owner
 */
router.get('/', authenticate, getProposalsForGig);

/**
 * @swagger
 * /api/gigs/{gigId}/proposals:
 *   post:
 *     summary: Submit a proposal on a gig
 *     tags: [Proposals]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: gigId
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
 *               - coverLetter
 *               - bidAmount
 *               - deliveryDays
 *             properties:
 *               coverLetter:
 *                 type: string
 *               bidAmount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: USD
 *               deliveryDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Proposal submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Proposal'
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, submitProposal);

/**
 * @swagger
 * /api/gigs/{gigId}/proposals/{proposalId}:
 *   put:
 *     summary: Accept or reject a proposal (gig owner only)
 *     tags: [Proposals]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: gigId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: proposalId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *     responses:
 *       200:
 *         description: Proposal status updated
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the gig owner
 */
router.put('/:proposalId', authenticate, updateProposalStatus);

/**
 * @swagger
 * /api/gigs/{gigId}/proposals/{proposalId}:
 *   delete:
 *     summary: Withdraw a proposal (proposal owner only)
 *     tags: [Proposals]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: gigId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal withdrawn
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not the proposal owner
 */
router.delete('/:proposalId', authenticate, withdrawProposal);

export default router;
