import { Router } from 'express';
import {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePasswordHandler,
  githubLogin,
  githubCallback,
  googleLogin,
  googleCallback,
  getMe,
  logout,
} from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: |
 *     Authentication — email/password registration, email verification,
 *     GitHub OAuth, Google OAuth, and session management.
 *
 *     Sessions are stored in an httpOnly `token` cookie (JWT).
 *     Include credentials when calling from the browser, or pass
 *     `Authorization: Bearer <token>` for API clients.
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register with email and password
 *     description: Creates a new user and sends a verification email. Does not issue a session until the email is verified.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created — verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', authLimiter, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Sign in with email and password
 *     description: Authenticates a verified user and sets the JWT session cookie.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful — session cookie set
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly JWT session cookie (`token`)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Email not verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorWithCode'
 */
router.post('/login', authLimiter, login);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address
 *     description: Confirms a user's email using the token from the verification link. Sets a session cookie on success.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token from the confirmation email
 *     responses:
 *       200:
 *         description: Email verified — session cookie set
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly JWT session cookie (`token`)
 *             schema:
 *               type: string
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyEmailResponse'
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/verify-email', verifyEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Sends a new verification email if the account exists and is not yet verified. Always returns success to avoid email enumeration.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendVerificationRequest'
 *     responses:
 *       200:
 *         description: Verification email queued (if applicable)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
router.post('/resend-verification', authLimiter, resendVerification);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email queued if account exists
 */
router.post('/forgot-password', authLimiter, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token from email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset — session cookie set
 */
router.post('/reset-password', authLimiter, resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/change-password', authenticate, authLimiter, changePasswordHandler);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Sign in with GitHub (OAuth)
 *     description: Redirects the browser to GitHub for authorization. On success, callback sets a session cookie and redirects to the frontend dashboard.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub authorization page
 */
router.get('/github', authLimiter, githubLogin);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     description: GitHub redirects here after authorization. Creates or updates the user, sets a JWT cookie, and redirects to the frontend.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from GitHub
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to frontend dashboard with session cookie set
 */
router.get('/github/callback', githubCallback);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Sign in with Google (OAuth)
 *     description: Redirects the browser to Google for authorization. On success, callback sets a session cookie and redirects to the frontend dashboard.
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google authorization page
 *       503:
 *         description: Google OAuth not configured
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/google', authLimiter, googleLogin);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Google redirects here after authorization. Creates or updates the user, sets a JWT cookie, and redirects to the frontend.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to frontend dashboard with session cookie set
 */
router.get('/google/callback', googleCallback);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Validates the session cookie or Bearer token and returns the current user profile. Use on page reload to restore session state.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out current user
 *     description: Clears the session cookie.
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', authenticate, logout);

export default router;
