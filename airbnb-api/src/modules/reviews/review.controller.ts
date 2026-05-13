import { Request, Response } from 'express';
import { reviewService } from './review.service';
import { ApiResponse } from '../../lib/api-response';
import {
  ReviewParams,
  ReviewQuery,
  PropertyReviewParams,
} from './review.schema';

// ─── Create Review ────────────────────────────────────────────────────────────
// TODO: replace with req.user.id after Week 4 auth
export const createReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  const authorId = req.user!.userId
  const review = await reviewService.createReview(authorId, req.body);
  ApiResponse.created(res, review);
};

// ─── Get Property Reviews ─────────────────────────────────────────────────────
export const getPropertyReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { propertyId } = req.params as PropertyReviewParams;
  const query = req.query as unknown as ReviewQuery;
  const reviews = await reviewService.getPropertyReviews(propertyId, query);
  ApiResponse.success(res, reviews);
};

// ─── Delete Review ────────────────────────────────────────────────────────────
// TODO: replace with req.user.id after Week 4 auth
export const deleteReview = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as ReviewParams;
  const authorId = req.user!.userId
  const result = await reviewService.deleteReview(id, authorId);
  ApiResponse.success(res, result);
};