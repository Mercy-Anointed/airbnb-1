import { Router } from 'express';
import {
  createBooking,
  initializePayment,
  verifyPayment,
  getBookingById,
  getMyBookings,
  getPropertyBookings,
  cancelBooking,
  deleteBooking,
  paystackWebhook,
  flutterwaveWebhook,
  updateBookingStatus,
} from './booking.controller';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../lib/async-handler';
import {
  createBookingSchema,
  initializePaymentSchema,
  verifyPaymentSchema,
  updateBookingStatusSchema,
  bookingQuerySchema,
  bookingParamsSchema,
} from './booking.schema';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import { UserRole } from '@prisma/client';
import { bookingLimiter } from '../../middleware/rate-limit.middleware';

const router = Router();

router.post('/webhooks/paystack', asyncHandler(paystackWebhook));
router.post('/webhooks/flutterwave', asyncHandler(flutterwaveWebhook));

// ─── Guest Routes ─────────────────────────────────────────────────────────────

// POST /api/v1/bookings — create a booking
// Only GUESTs and ADMINs can create bookings
// HOSTs cannot book their own properties (enforced in service)
router.post(
  '/',
  authenticate, 
  requireRole(UserRole.GUEST, UserRole.ADMIN),
  bookingLimiter,
  validate({ body: createBookingSchema }),
  asyncHandler(createBooking)
);

router.post(
  '/:id/payment/initialize',
  authenticate,
  requireRole(UserRole.GUEST, UserRole.ADMIN),
  validate({ params: bookingParamsSchema, body: initializePaymentSchema }),
  asyncHandler(initializePayment)
);

router.post(
  '/payment/verify',
  validate({ body: verifyPaymentSchema }),
  asyncHandler(verifyPayment)
);

// GET /api/v1/bookings/my — get own bookings
// Any authenticated user can view their bookings
router.get(
  '/my',
  authenticate,
  validate({ query: bookingQuerySchema }),
  asyncHandler(getMyBookings)
);

// GET /api/v1/bookings/property/:id — get all bookings for a property
router.get(
  '/property/:id',
  authenticate,        
  requireRole(UserRole.HOST, UserRole.ADMIN),
  validate({ params: bookingParamsSchema, query: bookingQuerySchema }),
  asyncHandler(getPropertyBookings)
);

// GET /api/v1/bookings/:id — get single booking

// Any authenticated user can view a specific booking
// Service checks ownership — only guest or host can see it
router.get(
  '/:id',
  authenticate, 
  validate({ params: bookingParamsSchema }),
  asyncHandler(getBookingById)
);

// PATCH /api/v1/bookings/:id/cancel — cancel booking
// Only GUESTs and ADMINs can cancel bookings
router.patch(
  '/:id/cancel',
   authenticate,
   requireRole(UserRole.GUEST, UserRole.ADMIN),
  validate({ params: bookingParamsSchema }),
  asyncHandler(cancelBooking)
);

router.delete(
  '/:id',
  authenticate,
  requireRole(UserRole.GUEST, UserRole.ADMIN),
  validate({ params: bookingParamsSchema }),
  asyncHandler(deleteBooking)
);

// ─── Host Routes ──────────────────────────────────────────────────────────────



// PATCH /api/v1/bookings/:id/status — update booking status
// Only HOSTs and ADMINs can update booking status
router.patch(
  '/:id/status',
  authenticate,      
  requireRole(UserRole.HOST, UserRole.ADMIN),
  validate({ params: bookingParamsSchema, body: updateBookingStatusSchema }),
  asyncHandler(updateBookingStatus)
);

export default router;
