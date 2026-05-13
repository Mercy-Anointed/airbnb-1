import { UserRole } from "@prisma/client";
import z from "zod";

export const registerSchema = z.object({
    name: z
    .string()
    .min(2, 'Name must be atleast 2 characters')
    .max(100, 'Name must not exceed 100 characters'),

    email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(), //normalize email - prevents duplicate accounts

    password: z
    .string()
    .min(8, 'Password must be atleast 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex( /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain atleast one uppercase letter, one lowercase letter and one number'),

    role: z
    .nativeEnum(UserRole)
    .optional()
    .default(UserRole.GUEST)
})

// ─── Login Schema ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),

    password: z
    .string()
    .min(1, 'Password is required')
})

// ─── Refresh Token Schema ─────────────────────────────────────────────────────
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
})

// ─── Change Password Schema ───────────────────────────────────────────────────
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
    .string()
    .min(8, 'Password must be atleast 8 characters')
    .max(100, 'Password must not exceed 100 characters')
    .regex( /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain atleast one uppercase letter, one lowercase letter, and one number'),

    confirmPasssword: z.string().min(1, 'Please confirm your password'),
    
})
.refine((data) => data.newPassword === data.confirmPasssword, {
    message: 'Password do not match',
    path: ['confirmPassword']
})
.refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
})

// ─── Verify OTP Schema ────────────────────────────────────────────────────────
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
})

// ─── Resend OTP Schema ────────────────────────────────────────────────────────
export const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
})



// ─── Inferred Types ───────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>
export type ResendOtpInput = z.infer<typeof resendOtpSchema>