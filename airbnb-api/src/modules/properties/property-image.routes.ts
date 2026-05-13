import { UserRole } from "@prisma/client";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
import { deleteImage, getPropertyImages, setPrimaryImage, uploadImage, uploadMultipleImages } from "./property-image.controller";
import { handlerMulterError, uploadMultiple, uploadSingle } from "../../middleware/upload.middleware";
import { Router } from "express";

const router = Router({mergeParams: true}); // mergeParams to access propertyId
// GET /api/v1/properties/:propertyId/images
router.get('/', asyncHandler(getPropertyImages));

// POST /api/v1/properties/:propertyId/images — single upload
router.post('/', authenticate, requireRole(UserRole.HOST, UserRole.ADMIN),
uploadSingle,
handlerMulterError,
asyncHandler(uploadImage)
);

// POST /api/v1/properties/:propertyId/images/bulk — multiple upload
router.post('/bulk', authenticate, requireRole(UserRole.HOST, UserRole.ADMIN),
uploadMultiple,
handlerMulterError,
asyncHandler(uploadMultipleImages)
);

// DELETE /api/v1/properties/:propertyId/images/:imageId
router.delete('/:imageId', authenticate, requireRole(UserRole.HOST, UserRole.ADMIN), 
asyncHandler(deleteImage));

// PATCH /api/v1/properties/:propertyId/images/:imageId/primary
router.patch('/:imageId/primary', authenticate, requireRole(UserRole.HOST, UserRole.ADMIN), 
asyncHandler(setPrimaryImage));

export default router