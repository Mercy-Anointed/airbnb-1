import { Router } from 'express';
import {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getHostProperties,
} from './property.controller';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyQuerySchema,
  propertyParamsSchema,
} from './property.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────
// No auth required — anyone can browse properties

// GET /api/v1/properties
router.get(
  '/',
  validate({ query: propertyQuerySchema }),
  asyncHandler(getProperties)
);

// GET /api/v1/properties/host/:id
router.get(
  '/host/:id',
  validate({ params: propertyParamsSchema }),
  asyncHandler(getHostProperties)
);

// GET /api/v1/properties/:id
router.get(
  '/:id',
  validate({ params: propertyParamsSchema }),
  asyncHandler(getPropertyById)
);



// ─── Protected Routes ─────────────────────────────────────────────────────────
// Auth middleware added here in Week 4
// Structure is already in place — just uncomment auth middleware

// POST /api/v1/properties
// Only HOSTs and ADMINs can create properties
router.post(
  '/',
  authenticate,        // JWT verification
 requireRole(UserRole.HOST, UserRole.ADMIN),
  validate({ body: createPropertySchema }),
  asyncHandler(createProperty)
);

// PATCH /api/v1/properties/:id
// Only HOSTs and ADMINs can update properties
router.patch(
  '/:id',
  authenticate,       
 requireRole(UserRole.HOST, UserRole.ADMIN),
  validate({ params: propertyParamsSchema, body: updatePropertySchema }),
  asyncHandler(updateProperty)
);

// DELETE /api/v1/properties/:id
// Only HOSTs and ADMINs can delete properties
router.delete(
  '/:id',
   authenticate,      
 requireRole(UserRole.HOST, UserRole.ADMIN),
  validate({ params: propertyParamsSchema }),
  asyncHandler(deleteProperty)
);

export default router;