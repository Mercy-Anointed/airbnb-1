import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { env } from "../../config/env";
import { LoginInput, RegisterInput, VerifyOtpInput } from './auth.schema';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { sendEmail } from '../../config/email';
import {
  otpEmailTemplate,
  passwordResetEmailTemplate,
  welcomeEmailTemplate
} from '../../lib/email-templates';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

// ─── Token Helpers ────────────────────────────────────────────────────────────

const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as any,
  })
}

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as any,
  })
}

const getRefreshTokenExpiry = (): Date => {
  const days = parseInt(env.JWT_REFRESH_EXPIRES_IN) || 7;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

// ─── OTP Helper ───────────────────────────────────────────────────────────────

// Generates a cryptographically secure 6-digit OTP
// Uses crypto.randomInt — never Math.random() for security-sensitive values
const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const authService = {

  // ─── Generate Auth Tokens ────────────────────────────────────────────────────
  async generateAuthTokens(user: { id: string; email: string; role: string }): Promise<AuthToken> {
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return { accessToken, refreshToken };
  },

  // ─── Register ────────────────────────────────────────────────────────────────
  // Creates user, sends OTP — does NOT return tokens yet
  // Tokens are only issued after email is verified
  async register(data: RegisterInput): Promise<{ email: string; message: string }> {

    // Step 1 — Check email not already taken
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
      select: { id: true, isEmailVerified: true }
    });

    if (existingUser) {
      // If they registered but never verified — resend OTP instead of erroring
      // Covers the case: user registered, closed the tab, came back
      if (!existingUser.isEmailVerified) {
        await this._sendOtp(existingUser.id, data.email, data.name ?? 'there');
        return {
          email: data.email,
          message: 'Account exists but is unverified. A new OTP has been sent to your email.',
        };
      }
      throw new AppError('Email already in use', 409);
    }

    // Step 2 — Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Step 3 — Create user (NOT verified yet — no tokens yet)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role,
        isEmailVerified: false,
      },
      select: { id: true, name: true, email: true }
    });

    // Step 4 — Generate & send OTP
    await this._sendOtp(user.id, user.email, user.name);

    return {
      email: user.email,
      message: 'Registration successful. Please check your email for your verification code.',
    };
  },

  // ─── Internal: Send OTP ───────────────────────────────────────────────────────
  // Private helper — generates OTP, saves to DB, sends email
  // Used by register + resendOtp
  async _sendOtp(userId: string, email: string, name: string): Promise<void> {
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.user.update({
      where: { id: userId },
      data: { otpCode: otp, otpExpiresAt }
    });

    await sendEmail({
      to: email,
      subject: 'Your Airbnb Verification Code',
      html: otpEmailTemplate(name, otp),
    });
  },

  // ─── Verify OTP ───────────────────────────────────────────────────────────────
  // User submits email + 6-digit OTP
  // On success: mark verified, send welcome email, return auth tokens
  async verifyOtp(data: VerifyOtpInput): Promise<AuthToken & { user: object }> {
    const user = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        otpCode: true,
        otpExpiresAt: true,
        isEmailVerified: true,
      }
    });

    if (!user) throw new AppError('Invalid email or OTP', 400);
    if (user.isEmailVerified) throw new AppError('Email is already verified. Please log in.', 400);
    if (!user.otpCode || !user.otpExpiresAt) throw new AppError('No OTP found. Please request a new one.', 400);

    // Check expiry first — better UX to tell them it expired vs. just "invalid"
    if (user.otpExpiresAt < new Date()) {
      throw new AppError('OTP has expired. Please request a new one.', 400);
    }

    // Constant-time comparison — prevents timing attacks
  const otpBuffer = Buffer.from(user.otpCode.padEnd(6));
const inputBuffer = Buffer.from(data.otp.padEnd(6));
if (!crypto.timingSafeEqual(otpBuffer, inputBuffer)) {
  throw new AppError('Invalid OTP. Please try again.', 400);
}

    // Mark verified and clear OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      }
    });

    // Send welcome email now that they're fully verified
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Airbnb!',
      html: welcomeEmailTemplate(user.name),
    });

    // Issue tokens — user is now fully authenticated
    const tokens = await this.generateAuthTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  },

  // ─── Resend OTP ───────────────────────────────────────────────────────────────
  // Always returns success — never reveal if email exists (enumeration protection)
  async resendOtp(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, name: true, email: true, isEmailVerified: true }
    });

    // Silently return if user not found or already verified
    if (!user || user.isEmailVerified) return;

    await this._sendOtp(user.id, user.email, user.name);
  },

  // ─── Login ────────────────────────────────────────────────────────────────────
  async login(data: LoginInput): Promise<AuthToken & { user: object }> {

    const user = await prisma.user.findFirst({
      where: { email: data.email, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        isEmailVerified: true,
      }
    });

    if (!user) throw new AppError('Invalid credentials', 401);

    if (!user.password) {
      throw new AppError('This account uses Google login. Please sign in with Google.', 400);
    }

    // ── EMAIL VERIFICATION GATE ─────────────────────────────────
    // Block login if not verified — send a fresh OTP so they can verify
    if (!user.isEmailVerified) {
      await this._sendOtp(user.id, user.email, user.name);
      throw new AppError(
        'Please verify your email before logging in. A new verification code has been sent to your email.',
        403
      );
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new AppError('Invalid credentials', 401);

    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      }
    });

    const { password: _, ...userWithoutPassword } = user;
    return { accessToken, refreshToken, user: userWithoutPassword };
  },

  // ─── Refresh Access Token ─────────────────────────────────────────────────────
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: { userId: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, role: true, deletedAt: true } } }
    });

    if (!storedToken || storedToken.user.deletedAt) throw new AppError('Refresh token not found', 401);

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { token: refreshToken } });
      throw new AppError('Refresh token expired', 401);
    }

    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newRefreshToken = generateRefreshToken(storedToken.user.id);
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: storedToken.user.id,
        expiresAt: getRefreshTokenExpiry(),
      }
    });

    const accessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  // ─── Logout ───────────────────────────────────────────────────────────────────
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },

  // ─── Logout All Devices ───────────────────────────────────────────────────────
  async logoutAllDevices(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },

  // ─── Forgot Password ──────────────────────────────────────────────────────────
  async forgotPassword(email: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: { id: true, name: true, email: true }
    });

    if (!user) return; // never reveal if email exists

    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.passwordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }
    });

    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password',
      html: passwordResetEmailTemplate(user.name, token),
    });
  },

  // ─── Reset Password ───────────────────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: { select: { id: true, deletedAt: true } } }
    });

    if (!resetRecord) throw new AppError('Invalid reset token', 400);
    if (resetRecord.user.deletedAt) throw new AppError('Invalid reset token', 400);
    if (resetRecord.used) throw new AppError('Reset token already used', 400);
    if (resetRecord.expiresAt < new Date()) throw new AppError('Reset token expired', 400);

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await Promise.all([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordReset.update({
        where: { token },
        data: { used: true }
      })
    ]);

    await this.logoutAllDevices(resetRecord.userId);
  },

  // ─── Change Password ──────────────────────────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { password: true }
    });

    if (!user) throw new AppError('User not found', 404);
    if (!user.password) throw new AppError('This account uses Google Sign-In. Please continue with Google.', 400);

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) throw new AppError('Current password is incorrect', 401);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    await this.logoutAllDevices(userId);
  },

  // ─── Get Me ───────────────────────────────────────────────────────────────────
  async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            properties: true,
            bookings: true,
          }
        }
      }
    });

    if (!user) throw new AppError('User not found', 404);
    return user;
  }
};

