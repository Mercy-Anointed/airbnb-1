import { Request, Response } from 'express';
import { bookingService } from '../bookings/booking.service';
import { ApiResponse } from '../../lib/api-response';
import {
  BookingParams,
  BookingQuery,
  InitializePaymentInput,
  UpdateBookingStatusInput,
  VerifyPaymentInput,
} from './booking.schema';

// ─── Create Booking ───────────────────────────────────────────────────────────
// TODO: replace with req.user.id after Week 4 auth
export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const guestId = req.user!.userId
  const booking = await bookingService.createBooking(guestId, req.body);
  ApiResponse.created(res, booking);
};

// ─── Get Booking By ID ────────────────────────────────────────────────────────
// TODO: replace with req.user.id after Week 4 auth
export const getBookingById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as BookingParams;
  const userId = req.user!.userId
  const booking = await bookingService.getBookingById(id, userId);
  ApiResponse.success(res, booking);
};

// ─── Get My Bookings ──────────────────────────────────────────────────────────
// TODO: replace with req.user.id after Week 4 auth
export const getMyBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  const guestId = req.user!.userId
  const query = req.query as unknown as BookingQuery;
  const bookings = await bookingService.getGuestBookings(guestId, query);
  ApiResponse.success(res, bookings);
};

// ─── Get Property Bookings ────────────────────────────────────────────────────
// Host views all bookings for their property
// TODO: replace with req.user.id after Week 4 auth
export const getPropertyBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id: propertyId } = req.params as BookingParams;
  const hostId = req.user!.userId
  const query = req.query as unknown as BookingQuery;
  const bookings = await bookingService.getPropertyBookings(
    propertyId,
    hostId,
    query
  );
  ApiResponse.success(res, bookings);
};

// ─── Cancel Booking ───────────────────────────────────────────────────────────
// TODO: replace with req.user.id after Week 4 auth
export const cancelBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as BookingParams;
  const guestId = req.user!.userId
  const result = await bookingService.cancelBooking(id, guestId);
  ApiResponse.success(res, result);
};

export const deleteBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as BookingParams;
  const guestId = req.user!.userId
  const result = await bookingService.deleteBooking(id, guestId);
  ApiResponse.success(res, result);
};

// ─── Update Booking Status ────────────────────────────────────────────────────
// Host updates booking status
// TODO: replace with req.user.id after Week 4 auth
export const updateBookingStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as BookingParams;
  const hostId = req.user!.userId
  const result = await bookingService.updateBookingStatus(
    id,
    hostId,
    req.body as UpdateBookingStatusInput
  );
  ApiResponse.success(res, result);
};

export const initializePayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params as BookingParams;
  const result = await bookingService.initializePayment(
    id,
    req.user!.userId,
    req.body as InitializePaymentInput
  );
  ApiResponse.success(res, result);
};

export const verifyPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await bookingService.verifyPayment(req.body as VerifyPaymentInput);
  ApiResponse.success(res, result);
};

export const paystackWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await bookingService.handlePaystackWebhook(
    (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body),
    req.header('x-paystack-signature') ?? undefined,
    req.body
  );
  ApiResponse.success(res, result);
};

export const flutterwaveWebhook = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await bookingService.handleFlutterwaveWebhook(
    req.header('verif-hash') ?? undefined,
    req.body
  );
  ApiResponse.success(res, result);
};
