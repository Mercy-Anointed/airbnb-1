import { z } from 'zod';
import { UserRole } from '@prisma/client';

// ─── Update Profile Schema ────────────────────────────────────────────────────
// Users can only update their own profile info
// Email and role changes are handled separately with stricter rules
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  avatar: z
    .string()
    .url('Avatar must be a valid URL')
    .optional(),
});

// ─── Update Role Schema ───────────────────────────────────────────────────────
// Only admins can change roles — enforced in Week 5 RBAC
export const updateRoleSchema = z.object({
  role: z.nativeEnum(UserRole, {
    message: 'Invalid role',
  }),
});

// ─── User Query Schema ────────────────────────────────────────────────────────
export const userQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
});

// ─── Params Schema ────────────────────────────────────────────────────────────
export const userParamsSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type UserParams = z.infer<typeof userParamsSchema>;