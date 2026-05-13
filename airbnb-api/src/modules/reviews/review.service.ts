import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { CacheKeys } from '../../lib/cache-keys';
import { parsePaginationParams, paginate, PaginatedResult } from '../../lib/pagination';
import { AppError } from '../../middleware/error.middleware';
import { CreateReviewInput, ReviewQuery } from './review.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewResult = {
  id: string;
  rating: number;
  comment: string;
  createdAt: Date;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
  property: {
    id: string;
    title: string;
    city: string;
  };
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const reviewService = {

  // ─── Create Review ──────────────────────────────────────────────────────────
  // Production rules enforced:
  // 1. Reviewer must have a COMPLETED booking for this property
  // 2. Reviewer cannot review the same property twice
  // 3. Reviewer cannot review themselves
  async createReview(
    authorId: string,
    data: CreateReviewInput
  ): Promise<ReviewResult> {

    // Rule 1 — prevent self review
    if (authorId === data.subjectId) {
      throw new AppError('You cannot review yourself', 400);
    }

    // Rule 2 — must have completed booking to leave a review
    // This is how Airbnb prevents fake reviews
    const completedBooking = await prisma.booking.findFirst({
      where: {
        guestId: authorId,
        propertyId: data.propertyId,
        status: 'COMPLETED',
      },
      select: { id: true },
    });

    if (!completedBooking) {
      throw new AppError(
        'You can only review properties you have stayed at',
        403
      );
    }

    // Rule 3 — prevent duplicate reviews
    const existingReview = await prisma.review.findFirst({
      where: {
        authorId,
        propertyId: data.propertyId,
      },
      select: { id: true },
    });

    if (existingReview) {
      throw new AppError(
        'You have already reviewed this property',
        409
      );
    }

    const review = await prisma.review.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        authorId,
        subjectId: data.subjectId,
        propertyId: data.propertyId,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        property: {
          select: {
            id: true,
            title: true,
            city: true,
          },
        },
      },
    });

    // Invalidate property cache — average rating has changed
    await Promise.all([
      cache.del(CacheKeys.properties.detail(data.propertyId)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
      cache.delByPattern(
        CacheKeys.reviews.patterns.byProperty(data.propertyId)
      ),
    ]);

    return review;
  },

  // ─── Get Property Reviews ───────────────────────────────────────────────────
  async getPropertyReviews(
    propertyId: string,
    query: ReviewQuery
  ): Promise<PaginatedResult<ReviewResult>> {
    const pagination = parsePaginationParams(query);
    const cacheKey = CacheKeys.reviews.byProperty(propertyId);
    const cached = await cache.get<PaginatedResult<ReviewResult>>(cacheKey);
    if (cached) return cached;

    const where = {
      propertyId,
      ...(query.rating && { rating: query.rating }),
    };

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              city: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    const result = paginate(reviews, total, pagination);
    await cache.set(cacheKey, result, 300);
    return result;
  },

  // ─── Delete Review ──────────────────────────────────────────────────────────
  // Only the author or an admin can delete a review
  // Admin enforcement added in Week 5 RBAC
  async deleteReview(id: string, authorId: string): Promise<{ message: string }> {
    const review = await prisma.review.findUnique({
      where: { id },
      select: {
        authorId: true,
        propertyId: true,
      },
    });

    if (!review) throw new AppError('Review not found', 404);
    if (review.authorId !== authorId) throw new AppError('Forbidden', 403);

    await prisma.review.delete({ where: { id } });

    // Invalidate caches — rating average has changed
    await Promise.all([
      cache.del(CacheKeys.properties.detail(review.propertyId)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
      cache.delByPattern(
        CacheKeys.reviews.patterns.byProperty(review.propertyId)
      ),
    ]);

    return { message: 'Review deleted successfully' };
  },
};
// ```

// ---

// **Key production rules in this file:**
// ```
// RULE                              WHY
// ──────────────────────────────────────────────────────────
// Completed booking required       → Prevents fake reviews
//                                    Same rule Airbnb uses

// Duplicate review check           → One review per stay
//                                    Data integrity

// Self review prevention           → Can't review yourself
//                                    Business logic integrity

// Cache invalidation on create     → Average rating changes
// and delete                         when reviews change
//                                    Property lists must update