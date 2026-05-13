import { Router } from 'express';
import {
  createReview,
  getPropertyReviews,
  deleteReview,
} from './review.controller';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import {
  createReviewSchema,
  reviewQuerySchema,
  reviewParamsSchema,
  propertyReviewParamsSchema,
} from './review.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

// GET /api/v1/reviews/property/:propertyId
// Public — anyone can read reviews
router.get(
  '/property/:propertyId',
  validate({ params: propertyReviewParamsSchema, query: reviewQuerySchema }),
  asyncHandler(getPropertyReviews)
);

// ─── Authenticated Routes ─────────────────────────────────────────────────────

// POST /api/v1/reviews
// Only GUESTs can write reviews
// Must have completed booking — enforced in service
router.post(
  '/',
  authenticate,
  requireRole(UserRole.GUEST, UserRole.ADMIN),
  validate({ body: createReviewSchema }),
  asyncHandler(createReview)
);

// DELETE /api/v1/reviews/:id
// Author or ADMIN can delete review
router.delete(
  '/:id',
  authenticate, 
  validate({ params: reviewParamsSchema }),
  asyncHandler(deleteReview)
);

export default router;