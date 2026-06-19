import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/auth.middleware";
import { authLimiter, registerLimiter } from "../../middleware/rate-limit.middleware";
import { authService } from "./auth.service";
import { ApiResponse } from "../../lib/api-response";
import passport from "../../config/passport";
import { changePassword, getMe, login, logout, logoutAllDevices, refreshToken, register, verifyOtp, resendOtp } from "./auth.controller";
import { changePasswordSchema, loginSchema, registerSchema, verifyOtpSchema, resendOtpSchema } from "./auth.schema";

const router = Router()
// ─── Public Routes ────────────────────────────────────────────────────────────
// No token required

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and authorization
 */

// POST /api/v1/auth/register
/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@test.com
 *               password:
 *                 type: string
 *                 example: Password123
 *               role:
 *                 type: string
 *                 enum: [GUEST, HOST, ADMIN]
 *                 example: GUEST
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
router.post('/register', registerLimiter, validate({body: registerSchema}), asyncHandler(register))

// POST /api/v1/auth/login
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@test.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful — returns accessToken
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */

router.post('/login', authLimiter, validate({body: loginSchema}), asyncHandler(login))


// POST /api/v1/auth/refresh
// Reads refresh token from cookie — no auth middleware needed

router.post('/refresh', asyncHandler(refreshToken));
// POST /api/v1/auth/logout
router.post('/logout', asyncHandler(logout))

// ─── Protected Routes ─────────────────────────────────────────────────────────
// Token required — authenticate middleware verifies JWT

// POST /api/v1/auth/logout-all
router.post('/logout-all', authenticate, asyncHandler(logoutAllDevices))

// GET /api/v1/auth/me
/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, asyncHandler(getMe))

// PATCH /api/v1/auth/change-password
router.patch('/change-password', authenticate, validate({body: changePasswordSchema}), asyncHandler(changePassword))

// Add these new schemas to auth.schema.ts first
// Then add routes:

// POST /api/v1/auth/verify-otp
router.post('/verify-otp',
  validate({ body: verifyOtpSchema }),
  asyncHandler(verifyOtp)
);

// POST /api/v1/auth/resend-otp  
router.post('/resend-otp',
  authLimiter, // rate limit resend — prevents OTP spam
  validate({ body: resendOtpSchema }),
  asyncHandler(resendOtp)
);

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', asyncHandler(async (req, res) => {
    const {email} = req.body;
    await authService.forgotPassword(email);
     // Always return success — never reveal if email exists
     ApiResponse.success(res, {
        message: 'If that email exists, a reset link has been sent'
     });
}))

// POST /api/v1/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
    const {token, newPassword} = req.body;
    await authService.resetPassword(token, newPassword);
    ApiResponse.success(res, {message: 'Password reset successfully'})
}))

// ── Route 1: Kick off the Google login ──────────────────────────────────────
// When a user hits this, Passport redirects them to Google's consent screen.
// scope tells Google what info we want: their profile and email address.
// The user never actually "lands" on this route — they're immediately sent to Google.
router.get('/google', passport.authenticate('google', {scope: ['profile', 'email'], session: false})
);

// ── Route 2: Google sends the user back here ─────────────────────────────────
// After Google confirms the user, it redirects to this URL with a "code".
// passport.authenticate handles exchanging that code for user profile data
// and runs your strategy callback (from passport.ts) before calling next().
// By the time your handler runs, req.user is already populated.
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user as any;

      // ── Use authService — consistent with entire codebase ──────
      const { accessToken, refreshToken } = await authService.generateAuthTokens({
        id: user.userId,
        email: user.email,
        role: user.role,
      });

      // ── Set refresh token in httpOnly cookie ───────────────────
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // ── Redirect with only the short-lived accessToken ─────────
      res.redirect(
        `${process.env.CLIENT_URL}/auth/callback?accessToken=${accessToken}`
      );
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
    }
  }
);


export default router
