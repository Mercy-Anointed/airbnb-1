import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { cache } from '../../config/redis';
import { CacheKeys } from '../../lib/cache-keys';
import { parsePaginationParams, paginate, PaginatedResult } from '../../lib/pagination';
import { AppError } from '../../middleware/error.middleware';
import {
  UpdateProfileInput,
  UpdateRoleInput,
  UserQuery,
} from './user.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

// Public profile shape — never expose password or sensitive fields
export type PublicProfile = {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  createdAt: Date;
  totalProperties: number;
  totalReviews: number;
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const userService = {

  // ─── Get User Profile ────────────────────────────────────────────────────
  async getUserById(id: string): Promise<PublicProfile> {
    const cacheKey = CacheKeys.users.profile(id);
    const cached = await cache.get<PublicProfile>(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        // Counts fetched in same query — no N+1
        _count: {
          select: {
            properties: true,
            reviewsGiven: true,
          },
        },
      },
    });

    if (!user) throw new AppError('User not found', 404);

    const result: PublicProfile = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      totalProperties: user._count.properties,
      totalReviews: user._count.reviewsGiven,
    };

    await cache.set(cacheKey, result, 300);
    return result;
  },

  // ─── Get All Users ───────────────────────────────────────────────────────
  // Admin only — enforced in Week 5 RBAC middleware
  async getUsers(query: UserQuery): Promise<PaginatedResult<PublicProfile>> {
    const pagination = parsePaginationParams(query);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role && { role: query.role }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          { email: { contains: query.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          avatar: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              properties: true,
              reviewsGiven: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    const items: PublicProfile[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      avatar: u.avatar,
      role: u.role,
      createdAt: u.createdAt,
      totalProperties: u._count.properties,
      totalReviews: u._count.reviewsGiven,
    }));

    return paginate(items, total, pagination);
  },

  // ─── Update Profile ──────────────────────────────────────────────────────
  // Users can only update their own profile
  // Ownership enforced in controller via req.user.id (Week 4)
  async updateProfile(
    id: string,
    data: UpdateProfileInput
  ): Promise<PublicProfile> {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            properties: true,
            reviewsGiven: true,
          },
        },
      },
    });

    const result: PublicProfile = {
      id: updated.id,
      name: updated.name,
      avatar: updated.avatar,
      role: updated.role,
      createdAt: updated.createdAt,
      totalProperties: updated._count.properties,
      totalReviews: updated._count.reviewsGiven,
    };

    // Invalidate cached profile — data changed
    await cache.del(CacheKeys.users.patterns.profile(id));

    return result;
  },

  // ─── Update Role ─────────────────────────────────────────────────────────
  // Admin only — enforced in Week 5 RBAC middleware
  async updateRole(id: string, data: UpdateRoleInput) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new AppError('User not found', 404);

    const updated = await prisma.user.update({
      where: { id },
      data: { role: data.role },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    // Invalidate cached profile
    await cache.del(CacheKeys.users.patterns.profile(id));

    return updated;
  },

  // ─── Delete User ─────────────────────────────────────────────────────────
  // Admin only — enforced in Week 5 RBAC middleware
  // Soft approach — in production you'd anonymize data (GDPR compliance)
  // rather than hard deleting
  async deleteUser(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!user) throw new AppError('User not found', 404);

    await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { userId: id } }),
      prisma.passwordReset.deleteMany({ where: { userId: id } }),
      prisma.property.updateMany({
        where: { hostId: id },
        data: { isActive: false },
      }),
      prisma.user.update({
        where: { id },
        data: {
          email: `deleted-${id}@deleted.local`,
          name: 'Deleted user',
          avatar: null,
          password: null,
          googleId: null,
          isEmailVerified: false,
          otpCode: null,
          otpExpiresAt: null,
          deletedAt: new Date(),
        },
      }),
    ]);

    await Promise.all([
      cache.del(CacheKeys.users.patterns.profile(id)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
      cache.delByPattern(CacheKeys.properties.patterns.byHost(id)),
      cache.delByPattern(CacheKeys.bookings.patterns.byGuest(id)),
    ]);

    return { message: 'User deleted successfully' };
  },
};
