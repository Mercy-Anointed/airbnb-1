import { Router } from 'express';
import {
  getUsers,
  getUserById,
  getMyProfile,
  updateProfile,
  updateRole,
  deleteUser,
} from './user.controller';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import {
  updateProfileSchema,
  updateRoleSchema,
  userQuerySchema,
  userParamsSchema,
} from './user.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────


// ─── Authenticated Routes ─────────────────────────────────────────────────────
// authenticate middleware added in Week 4

// GET /api/v1/users/me — get own profile
router.get(
  '/me',
  authenticate, 
  asyncHandler(getMyProfile)
);

// PATCH /api/v1/users/me — update own profile
router.patch(
  '/me',
  authenticate, 
  validate({ body: updateProfileSchema }),
  asyncHandler(updateProfile)
);



// ─── Admin Only Routes ────────────────────────────────────────────────────────
// authenticate + requireRole('ADMIN') added in Week 5

// GET /api/v1/users — list all users
router.get(
  '/',
  authenticate,       
  requireRole(UserRole.ADMIN),
  validate({ query: userQuerySchema }),
  asyncHandler(getUsers)
);

// GET /api/v1/users/:id — view any public profile
router.get(
  '/:id',
  validate({ params: userParamsSchema }),
  asyncHandler(getUserById)
);

// PATCH /api/v1/users/:id/role — change user role
router.patch(
  '/:id/role',
  authenticate,    
 requireRole(UserRole.ADMIN),
  validate({ params: userParamsSchema, body: updateRoleSchema }),
  asyncHandler(updateRole)
);

// DELETE /api/v1/users/:id — delete user
router.delete(
  '/:id',
  authenticate,      
 requireRole(UserRole.ADMIN),
  validate({ params: userParamsSchema }),
  asyncHandler(deleteUser)
);

export default router;