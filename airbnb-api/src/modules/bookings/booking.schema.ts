import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { PaymentProvider } from '@prisma/client';

const parseBookingDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
};

const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

// ─── Create Booking Schema ────────────────────────────────────────────────────
export const createBookingSchema = z
  .object({
    propertyId: z.string().min(1, 'Property ID is required'),
    checkIn: z
      .string({ message: 'Check-in date is required' })
      .transform(parseBookingDate)
      .refine((date) => !Number.isNaN(date.getTime()), 'Invalid check-in date'),
    checkOut: z
      .string({ message: 'Check-out date is required' })
      .transform(parseBookingDate)
      .refine((date) => !Number.isNaN(date.getTime()), 'Invalid check-out date'),
  })
  .refine((data) => data.checkIn >= startOfTodayUtc(), {
    message: 'Check-in date cannot be in the past',
    path: ['checkIn'],
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: 'Check-out must be after check-in',
    path: ['checkOut'],
  });

// ─── Update Booking Status Schema ─────────────────────────────────────────────
// Only status can be updated — dates and price are immutable after creation
// Changing dates would require cancelling and rebooking — Airbnb's actual policy
export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    message: 'Invalid booking status',
  }),
});

// ─── Query Schema ─────────────────────────────────────────────────────────────
export const bookingQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(BookingStatus).optional(),
});

// ─── Params Schema ────────────────────────────────────────────────────────────
export const bookingParamsSchema = z.object({
  id: z.string().min(1, 'Booking ID is required'),
});

export const initializePaymentSchema = z.object({
  provider: z.nativeEnum(PaymentProvider).default(PaymentProvider.PAYSTACK),
});

export const verifyPaymentSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  reference: z.string().min(1, 'Payment reference is required'),
  transactionId: z.string().optional(),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type BookingQuery = z.infer<typeof bookingQuerySchema>;
export type BookingParams = z.infer<typeof bookingParamsSchema>;
export type InitializePaymentInput = z.infer<typeof initializePaymentSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
