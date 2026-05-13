import { z } from 'zod';

// ─── Create Review Schema ─────────────────────────────────────────────────────
export const createReviewSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
  subjectId: z.string().min(1, 'Subject user ID is required'),
  rating: z
    .number()
    .int('Rating must be a whole number')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment must be less than 1000 characters'),
});

// ─── Query Schema ─────────────────────────────────────────────────────────────
export const reviewQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  rating: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined)),
});

// ─── Params Schema ────────────────────────────────────────────────────────────
export const reviewParamsSchema = z.object({
  id: z.string().min(1, 'Review ID is required'),
});

// ─── Property Reviews Params ──────────────────────────────────────────────────
export const propertyReviewParamsSchema = z.object({
  propertyId: z.string().min(1, 'Property ID is required'),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
export type ReviewParams = z.infer<typeof reviewParamsSchema>;
export type PropertyReviewParams = z.infer<typeof propertyReviewParamsSchema>;