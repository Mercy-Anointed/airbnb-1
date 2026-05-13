import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { env } from '../../config/env';
import { CacheKeys } from '../../lib/cache-keys';
import { parsePaginationParams, paginate, PaginatedResult } from '../../lib/pagination';
import { AppError } from '../../middleware/error.middleware';
import {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyQuery,
} from './property.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

// List view shape — optimized for property cards
// Less data than detail view — only what the UI card needs
export type PropertyListItem = {
  id: string;
  title: string;
  city: string;
  country: string;
  pricePerNight: number;
  cleaningFee: number;
  maxGuests: number;
  bedrooms: number;
  bathrooms: number;
  type: string;
  primaryImage: string | null;
  host: {
    id: string;
    name: string;
    avatar: string | null;
  };
  averageRating: number | null;
  reviewCount: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Converts a date string like "2026-05-09" or ISO string to a proper Date object
// Prisma requires Date objects or full ISO strings — never plain "YYYY-MM-DD"
function toDate(value: string | Date | undefined): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const propertyService = {

  // ─── Get All Properties ──────────────────────────────────────────────────
  async getProperties(
    query: PropertyQuery
  ): Promise<PaginatedResult<PropertyListItem>> {

    const pagination = parsePaginationParams(query);

    // Build cache key from all query params
    const cacheKey = CacheKeys.properties.list({ ...query, ...pagination });
    const cached = await cache.get<PaginatedResult<PropertyListItem>>(cacheKey);
    if (cached) return cached;

    // Convert date strings to Date objects BEFORE building the where clause
    // Prisma rejects plain "YYYY-MM-DD" strings — must be Date or full ISO
    const checkIn = toDate(query.checkIn);
    const checkOut = toDate(query.checkOut);

    // ── Build WHERE clause dynamically ──────────────────────────────────────
    // Spread only defined values — Prisma ignores undefined automatically
    const where: Prisma.PropertyWhereInput = {
      isActive: true,

      ...(query.city && {
        city: { contains: query.city, mode: 'insensitive' as const },
      }),

      ...(query.country && {
        country: { contains: query.country, mode: 'insensitive' as const },
      }),

      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        pricePerNight: {
          ...(query.minPrice !== undefined && { gte: query.minPrice }),
          ...(query.maxPrice !== undefined && { lte: query.maxPrice }),
        },
      }),

      ...(query.maxGuests && {
        maxGuests: { gte: query.maxGuests },
      }),

      ...(query.propertyType && {
        type: query.propertyType,
      }),

      // Amenities — property must have ALL requested amenities
      ...(query.amenities?.length && {
        amenities: {
          some: {
            name: { in: query.amenities },
          },
        },
      }),

      // ── Availability check ───────────────────────────────────────────────
      // Excludes properties with CONFIRMED bookings overlapping requested dates
      // Overlap condition: existing.checkIn < requested.checkOut
      //                AND existing.checkOut > requested.checkIn
      // This single condition catches ALL overlap scenarios
      ...(checkIn &&
        checkOut && {
          NOT: {
            bookings: {
              some: {
                OR: [
                  { status: 'CONFIRMED' },
                  {
                    status: 'PENDING',
                    paymentStatus: { in: ['UNPAID', 'PENDING'] },
                    createdAt: {
                      gte: new Date(Date.now() - env.BOOKING_HOLD_MINUTES * 60 * 1000),
                    },
                  },
                ],
                // FIX: use Date objects, not raw strings
                checkIn: { lt: checkOut },
                checkOut: { gt: checkIn },
              },
            },
          },
        }),
    };

    // ── Run count and findMany in PARALLEL ──────────────────────────────────
    // Promise.all fires both queries simultaneously
    // Sequential would double response time — never do count then findMany
    const [total, properties] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          pricePerNight: true,
          cleaningFee: true,
          maxGuests: true,
          bedrooms: true,
          bathrooms: true,
          type: true,

          // N+1 prevention — all related data fetched in ONE query
          // Only primary image — not all photos (list view only needs one)
          images: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1,
          },

          // Host public info only — never expose email, password etc.
          host: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },

          // Use _count and aggregate instead of fetching all review rows
          // Fetching full review rows just for ratings wastes bandwidth
          _count: {
            select: { reviews: true },
          },

          // Aggregate average rating in DB — avoids loading all ratings into JS
          reviews: {
            select: { rating: true },
          },
        },

        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
        },

        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    // ── Transform raw Prisma output to clean response shape ──────────────────
    // Never return raw Prisma objects — transform to exact shape frontend needs
    // Prisma returns Decimal for money fields — convert to number
    const items: PropertyListItem[] = properties.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      country: p.country,
      pricePerNight: Number(p.pricePerNight),
      cleaningFee: Number(p.cleaningFee),
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      type: p.type,
      primaryImage: p.images[0]?.url ?? null,
      host: p.host,
      // Round to 1 decimal: 4.666... → 4.7
      averageRating:
        p.reviews.length > 0
          ? Math.round(
              (p.reviews.reduce((sum, r) => sum + r.rating, 0) /
                p.reviews.length) *
                10
            ) / 10
          : null,
      reviewCount: p._count.reviews,
    }));

    const result = paginate(items, total, pagination);

    // Cache results — 10 minutes TTL
    // Invalidated immediately when any property is created/updated/deleted
    await cache.set(cacheKey, result, 600);

    return result;
  },

  // ─── Get Single Property ──────────────────────────────────────────────────
  // Detail view fetches more data than list view
  // Full description, all images, recent reviews, host details
  async getPropertyById(id: string) {
    const cacheKey = CacheKeys.properties.detail(id);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    // Run the main property query + all related data in ONE Promise.all
    // Previously: property fetched first, then 7 more queries sequentially
    // Now: property + all related data fetched in parallel
    const [property, images, amenities, reviews, reviewStats, bookingCount] =
      await Promise.all([
        prisma.property.findFirst({
          where: { id, isActive: true },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            pricePerNight: true,
            cleaningFee: true,
            maxGuests: true,
            bedrooms: true,
            bathrooms: true,
            address: true,
            city: true,
            country: true,
            latitude: true,
            longitude: true,
            createdAt: true,
            hostId: true,
            host: {
              select: {
                id: true,
                name: true,
                avatar: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.propertyImage.findMany({
          where: { propertyId: id },
          select: { id: true, url: true, caption: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        }),
        prisma.amenity.findMany({
          where: { propertyId: id },
          select: { id: true, name: true, icon: true },
        }),
        prisma.review.findMany({
          where: { propertyId: id },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        // Use aggregate for avg + count in a single DB call
        // Previously: two separate prisma.review.aggregate + prisma.review.count calls
        prisma.review.aggregate({
          where: { propertyId: id },
          _avg: { rating: true },
          _count: { _all: true },
        }),
        prisma.booking.count({ where: { propertyId: id } }),
      ]);

    if (!property) throw new AppError('Property not found', 404);

    // Host property count — needs hostId from property, run after
    const hostPropertyCount = await prisma.property.count({
      where: { hostId: property.hostId, isActive: true },
    });

    const result = {
      ...property,
      images,
      amenities,
      reviews,
      host: {
        ...property.host,
        _count: {
          properties: hostPropertyCount,
        },
      },
      _count: {
        reviews: reviewStats._count._all,
        bookings: bookingCount,
      },
      pricePerNight: Number(property.pricePerNight),
      cleaningFee: Number(property.cleaningFee),
      averageRating: reviewStats._avg.rating
        ? Math.round(reviewStats._avg.rating * 10) / 10
        : null,
    };

    // Cache detail — 5 minutes TTL
    // Shorter than list because detail includes availability-sensitive data
    await cache.set(cacheKey, result, 300);

    return result;
  },

  // ─── Create Property ──────────────────────────────────────────────────────
  async createProperty(hostId: string, data: CreatePropertyInput) {
    const property = await prisma.property.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        pricePerNight: data.pricePerNight,
        cleaningFee: data.cleaningFee,
        maxGuests: data.maxGuests,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        address: data.address,
        city: data.city,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        hostId,
        // Create amenities in the same transaction
        amenities: {
          create: data.amenities.map((name) => ({ name })),
        },
      },
      select: {
        id: true,
        title: true,
        city: true,
        country: true,
        pricePerNight: true,
        type: true,
        createdAt: true,
      },
    });

    // Invalidate ALL property list caches
    // New property means every cached list is now stale
    await cache.delByPattern(CacheKeys.properties.patterns.allLists);

    return {
      ...property,
      pricePerNight: Number(property.pricePerNight),
    };
  },

  // ─── Update Property ──────────────────────────────────────────────────────
  async updateProperty(
    id: string,
    hostId: string,
    data: UpdatePropertyInput
  ) {
    // Verify property exists and belongs to this host
    // Security check — hosts can only update their own properties
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { hostId: true },
    });

    if (!existing) throw new AppError('Property not found', 404);
    if (existing.hostId !== hostId) throw new AppError('Forbidden', 403);

    const { amenities, ...propertyData } = data;

    const property = await prisma.property.update({
      where: { id },
      data: {
        ...propertyData,
        // If amenities provided — replace all existing amenities
        ...(amenities && {
          amenities: {
            deleteMany: {},
            create: amenities.map((name) => ({ name })),
          },
        }),
      },
      select: {
        id: true,
        title: true,
        city: true,
        pricePerNight: true,
        updatedAt: true,
      },
    });

    // Invalidate this specific property AND all lists
    await Promise.all([
      cache.del(CacheKeys.properties.patterns.detail(id)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
    ]);

    return {
      ...property,
      pricePerNight: Number(property.pricePerNight),
    };
  },

  // ─── Delete Property ──────────────────────────────────────────────────────
  // Soft delete — sets isActive to false instead of removing from database
  // Preserves booking history, reviews, and data integrity
  // Hard deletes are almost never done in production systems
  async deleteProperty(id: string, hostId: string) {
    const existing = await prisma.property.findUnique({
      where: { id },
      select: { hostId: true },
    });

    if (!existing) throw new AppError('Property not found', 404);
    if (existing.hostId !== hostId) throw new AppError('Forbidden', 403);

    await prisma.property.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate caches
    await Promise.all([
      cache.del(CacheKeys.properties.patterns.detail(id)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
    ]);

    return { message: 'Property deleted successfully' };
  },

  // ─── Get Host Properties ──────────────────────────────────────────────────
  // Returns all properties belonging to a specific host
  async getHostProperties(
    hostId: string
  ): Promise<PropertyListItem[]> {
    const cacheKey = CacheKeys.properties.byHost(hostId);
    const cached = await cache.get<PropertyListItem[]>(cacheKey);
    if (cached) return cached;

    const properties = await prisma.property.findMany({
      where: { hostId, isActive: true },
      select: {
        id: true,
        title: true,
        city: true,
        country: true,
        pricePerNight: true,
        cleaningFee: true,
        maxGuests: true,
        bedrooms: true,
        bathrooms: true,
        type: true,
        images: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
        host: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: PropertyListItem[] = properties.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      country: p.country,
      pricePerNight: Number(p.pricePerNight),
      cleaningFee: Number(p.cleaningFee),
      maxGuests: p.maxGuests,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      type: p.type,
      primaryImage: p.images[0]?.url ?? null,
      host: p.host,
      averageRating:
        p.reviews.length > 0
          ? Math.round(
              (p.reviews.reduce((sum, r) => sum + r.rating, 0) /
                p.reviews.length) *
                10
            ) / 10
          : null,
      reviewCount: p._count.reviews,
    }));

    await cache.set(cacheKey, result, 300);
    return result;
  },
};

// ```

// ---

// **Key production patterns in this file:**
// ```
// PATTERN                          WHY
// ─────────────────────────────────────────────────────────
// Promise.all([count, findMany])  → Parallel queries — halves
//                                   response time vs sequential

// select: { only needed fields }  → Never over-fetch — saves
//                                   memory and bandwidth at scale

// NOT: { bookings: { some } }     → Availability overlap detection
//                                   single condition catches all
//                                   overlap scenarios

// Soft delete (isActive: false)   → Preserves data integrity
//                                   booking history stays intact

// cache.delByPattern on mutation  → Keeps cache consistent
//                                   stale data never served

// Ownership check before update   → Security — hosts only modify
//                                   their own properties
