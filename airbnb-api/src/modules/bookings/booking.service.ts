import { prisma } from '../../config/database';
import { sendEmail } from '../../config/email';
import { cache } from '../../config/redis';
import { CacheKeys } from '../../lib/cache-keys';
import { bookingConfirmationTemplate, bookingNotificationTemplate } from '../../lib/email-templates';
import { parsePaginationParams, paginate, PaginatedResult } from '../../lib/pagination';
import { AppError } from '../../middleware/error.middleware';
import {
  notifyBookingConfirmed,
  notifyNewBookingRequest,
  notifyBookingCancelled,
} from '../../lib/notification'; // ← new
import {
  CreateBookingInput,
  InitializePaymentInput,
  UpdateBookingStatusInput,
  VerifyPaymentInput,
  BookingQuery,
} from './booking.schema';
import { env } from '../../config/env';
import { PaymentProvider } from '@prisma/client';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingResult = {
  id: string;
  checkIn: Date;
  checkOut: Date;
  totalPrice: number;
  nightsCount: number;
  status: string;
  currency: string;
  paymentStatus: string;
  paymentProvider: string | null;
  paymentReference: string | null;
  createdAt: Date;
  property: {
    id: string;
    title: string;
    city: string;
    country: string;
    pricePerNight: number;
  };
  guest: {
    id: string;
    name: string;
    avatar: string | null;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const calculateNights = (checkIn: Date, checkOut: Date): number => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((checkOut.getTime() - checkIn.getTime()) / msPerDay);
};

const toKobo = (amount: number) => Math.round(amount * 100);

const makePaymentReference = (provider: PaymentProvider, bookingId: string) =>
  `${provider.toLowerCase()}-${bookingId}-${Date.now()}`;

const activeHoldCutoff = () =>
  new Date(Date.now() - env.BOOKING_HOLD_MINUTES * 60 * 1000);

const gatewayRequest = async <T>(
  url: string,
  secretKey: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    },
  });
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new AppError(data.message ?? 'Payment gateway request failed', 502);
  }
  return data;
};

const verifyPaystackSignature = (rawBody: string, signature?: string) => {
  if (!env.PAYSTACK_WEBHOOK_SECRET) return true;
  if (!signature) return false;

  const hash = crypto
    .createHmac('sha512', env.PAYSTACK_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  const expected = Buffer.from(hash);
  const received = Buffer.from(signature);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

const verifyFlutterwaveSignature = (signature?: string) => {
  if (!env.FLUTTERWAVE_WEBHOOK_SECRET) return true;
  return signature === env.FLUTTERWAVE_WEBHOOK_SECRET;
};

const confirmPaidBooking = async (reference: string) => {
  const booking = await prisma.booking.findUnique({
    where: { paymentReference: reference },
    select: {
      id: true,
      guestId: true,
      propertyId: true,
      checkIn: true,
      checkOut: true,
      totalPrice: true,
      paymentStatus: true,
      property: {
        select: {
          title: true,
          hostId: true,
          host: { select: { name: true, email: true } },
        },
      },
      guest: { select: { name: true, email: true } },
    },
  });

  if (!booking) throw new AppError('Booking not found for payment reference', 404);
  if (booking.paymentStatus === 'PAID') {
    return { bookingId: booking.id, status: 'PAID' };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: 'CONFIRMED',
      paymentStatus: 'PAID',
      paidAt: new Date(),
    },
  });

  await Promise.all([
    cache.del(CacheKeys.properties.detail(booking.propertyId)),
    cache.delByPattern(CacheKeys.properties.patterns.allLists),
    cache.delByPattern(CacheKeys.bookings.patterns.byGuest(booking.guestId)),
    cache.delByPattern(CacheKeys.bookings.patterns.byProperty(booking.propertyId)),
  ]);

  notifyNewBookingRequest(booking.property.hostId ?? '', {
    bookingId: booking.id,
    propertyTitle: booking.property.title,
    guestName: booking.guest.name,
  });

  notifyBookingConfirmed(booking.guestId, {
    bookingId: booking.id,
    propertyTitle: booking.property.title,
    checkIn: booking.checkIn.toISOString(),
    checkOut: booking.checkOut.toISOString(),
  });

  await Promise.all([
    sendEmail({
      to: booking.guest.email,
      subject: `Booking Confirmed: ${booking.property.title}`,
      html: bookingConfirmationTemplate(
        booking.guest.name,
        booking.property.title,
        booking.checkIn,
        booking.checkOut,
        Number(booking.totalPrice),
        booking.id
      ),
    }),
    sendEmail({
      to: booking.property.host.email,
      subject: `New Paid Booking: ${booking.property.title}`,
      html: bookingNotificationTemplate(
        booking.property.host.name,
        booking.guest.name,
        booking.property.title,
        booking.checkIn,
        booking.checkOut,
        Number(booking.totalPrice)
      ),
    }),
  ]);

  return { bookingId: booking.id, status: 'PAID' };
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const bookingService = {

  // ─── Create Booking ────────────────────────────────────────────────────────
  async createBooking(
    guestId: string,
    data: CreateBookingInput
  ): Promise<BookingResult> {

    const booking = await prisma.$transaction(async (tx) => {

      // Step 1 — Verify property exists and is active
      const property = await tx.property.findUnique({
        where: { id: data.propertyId, isActive: true },
        select: {
          id: true,
          title: true,
          city: true,
          country: true,
          pricePerNight: true,
          cleaningFee: true,
          hostId: true,
        },
      });

      if (!property) throw new AppError('Property not found', 404);

      // Step 2 — Prevent guest from booking their own property
      if (property.hostId === guestId) {
        throw new AppError('You cannot book your own property', 400);
      }

      // Step 3 — Check availability inside the transaction
      const conflictingBooking = await tx.booking.findFirst({
        where: {
          propertyId: data.propertyId,
          OR: [
            { status: 'CONFIRMED' },
            {
              status: 'PENDING',
              paymentStatus: { in: ['UNPAID', 'PENDING'] },
              createdAt: { gte: activeHoldCutoff() },
            },
          ],
          checkIn: { lt: data.checkOut },
          checkOut: { gt: data.checkIn },
        },
        select: { id: true },
      });

      if (conflictingBooking) {
        throw new AppError(
          'Property is not available for the selected dates',
          409
        );
      }

      // Step 4 — Calculate price
      const nights = calculateNights(data.checkIn, data.checkOut);
      const pricePerNight = Number(property.pricePerNight);
      const cleaningFee = Number(property.cleaningFee ?? 0);
      const totalPrice = pricePerNight * nights + cleaningFee;

      // Step 5 — Create booking
      return await tx.booking.create({
        data: {
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          nightsCount: nights,
          totalPrice,
          status: 'PENDING',
          guestId,
          propertyId: data.propertyId,
        },
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          nightsCount: true,
          status: true,
          currency: true,
          paymentStatus: true,
          paymentProvider: true,
          paymentReference: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              country: true,
              pricePerNight: true,
              hostId: true, // ← needed for notification
            },
          },
          guest: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
    }, {
      maxWait: 10000,
      timeout: 20000,
    });

    // ── Invalidate caches ─────────────────────────────────────────────────────
    await Promise.all([
      cache.del(CacheKeys.properties.detail(data.propertyId)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
      cache.delByPattern(
        CacheKeys.bookings.patterns.byProperty(data.propertyId)
      ),
      cache.delByPattern(CacheKeys.bookings.patterns.byGuest(guestId)),
    ]);

    const result = {
      ...booking,
      totalPrice: Number(booking.totalPrice),
      property: {
        ...booking.property,
        pricePerNight: Number(booking.property.pricePerNight),
      },
    };

    // ── Real-time notifications ───────────────────────────────────────────────
    // Fire and forget — do NOT await these.
    // Reasoning: the booking already succeeded and is saved to the DB.
    // A notification failure must never cause the booking response to fail.
    // If the user is offline, sendToUser() returns false silently — no crash.
    // This is called "fire and forget" — we trigger it and move on.
    notifyNewBookingRequest(booking.property.hostId ?? '', {
      bookingId: booking.id,
      propertyTitle: booking.property.title,
      guestName: booking.guest.name,
    });

    const [guestData, hostData] = await Promise.all([
      prisma.user.findUnique({
        where: { id: guestId },
        select: { name: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: booking.property.hostId ?? '' },
        select: { name: true, email: true },
      }),
    ]);

    if (guestData && hostData) {
      await Promise.all([
        sendEmail({
          to: hostData.email,
          subject: `New Booking Request: ${booking.property.title}`,
          html: bookingNotificationTemplate(
            hostData.name,
            guestData.name,
            booking.property.title,
            booking.checkIn,
            booking.checkOut,
            Number(booking.totalPrice)
          ),
        }),
        sendEmail({
          to: guestData.email,
          subject: `Booking Request Received: ${booking.property.title}`,
          html: bookingConfirmationTemplate(
            guestData.name,
            booking.property.title,
            booking.checkIn,
            booking.checkOut,
            Number(booking.totalPrice),
            booking.id
          ),
        }),
      ]);
    }

    return result;
  },

  // ─── Get Booking By ID ─────────────────────────────────────────────────────
  async initializePayment(
    bookingId: string,
    guestId: string,
    data: InitializePaymentInput
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        guestId: true,
        status: true,
        totalPrice: true,
        paymentStatus: true,
        paymentReference: true,
        property: { select: { title: true } },
        guest: { select: { email: true, name: true } },
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.guestId !== guestId) throw new AppError('Forbidden', 403);
    if (booking.status !== 'PENDING') {
      throw new AppError('Only pending bookings can be paid for', 400);
    }
    if (booking.paymentStatus === 'PAID') {
      throw new AppError('Booking is already paid', 400);
    }

    const provider = data.provider;
    const reference = booking.paymentReference ?? makePaymentReference(provider, booking.id);
    const amount = Number(booking.totalPrice);
    const callbackUrl = `${env.CLIENT_URL}/payments/callback?provider=${provider.toLowerCase()}`;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentProvider: provider,
        paymentStatus: 'PENDING',
        paymentReference: reference,
      },
    });

    if (provider === PaymentProvider.PAYSTACK) {
      if (!env.PAYSTACK_SECRET_KEY) throw new AppError('Paystack is not configured', 500);
      const response = await gatewayRequest<{
        status: boolean;
        data: { authorization_url: string; reference: string };
      }>('https://api.paystack.co/transaction/initialize', env.PAYSTACK_SECRET_KEY, {
        method: 'POST',
        body: JSON.stringify({
          email: booking.guest.email,
          amount: toKobo(amount),
          currency: 'NGN',
          reference,
          callback_url: callbackUrl,
          metadata: { bookingId: booking.id, guestId },
        }),
      });

      return {
        provider,
        authorizationUrl: response.data.authorization_url,
        reference: response.data.reference,
      };
    }

    if (!env.FLUTTERWAVE_SECRET_KEY) throw new AppError('Flutterwave is not configured', 500);
    const response = await gatewayRequest<{
      status: string;
      data: { link: string };
    }>('https://api.flutterwave.com/v3/payments', env.FLUTTERWAVE_SECRET_KEY, {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: reference,
        amount,
        currency: 'NGN',
        redirect_url: callbackUrl,
        customer: {
          email: booking.guest.email,
          name: booking.guest.name,
        },
        customizations: {
          title: 'Airbnb booking',
          description: booking.property.title,
        },
        meta: { bookingId: booking.id, guestId },
      }),
    });

    return {
      provider,
      authorizationUrl: response.data.link,
      reference,
    };
  },

  async verifyPayment(data: VerifyPaymentInput) {
    const booking = await prisma.booking.findUnique({
      where: { paymentReference: data.reference },
      select: {
        id: true,
        guestId: true,
        checkIn: true,
        checkOut: true,
        totalPrice: true,
        paymentStatus: true,
        property: { select: { title: true, hostId: true } },
        guest: { select: { name: true } },
      },
    });

    if (!booking) throw new AppError('Booking not found for payment reference', 404);
    if (booking.paymentStatus === 'PAID') {
      return { bookingId: booking.id, status: 'PAID' };
    }

    const expectedAmount = Number(booking.totalPrice);
    let successful = false;

    if (data.provider === PaymentProvider.PAYSTACK) {
      if (!env.PAYSTACK_SECRET_KEY) throw new AppError('Paystack is not configured', 500);
      const response = await gatewayRequest<{
        status: boolean;
        data: { status: string; currency: string; amount: number; reference: string };
      }>(`https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`, env.PAYSTACK_SECRET_KEY);

      successful =
        response.data.status === 'success' &&
        response.data.currency === 'NGN' &&
        response.data.reference === data.reference &&
        response.data.amount >= toKobo(expectedAmount);
    } else {
      if (!env.FLUTTERWAVE_SECRET_KEY) throw new AppError('Flutterwave is not configured', 500);
      if (!data.transactionId) throw new AppError('Flutterwave transactionId is required', 400);
      const response = await gatewayRequest<{
        status: string;
        data: { status: string; currency: string; amount: number; tx_ref: string };
      }>(`https://api.flutterwave.com/v3/transactions/${encodeURIComponent(data.transactionId)}/verify`, env.FLUTTERWAVE_SECRET_KEY);

      successful =
        response.data.status === 'successful' &&
        response.data.currency === 'NGN' &&
        response.data.tx_ref === data.reference &&
        response.data.amount >= expectedAmount;
    }

    if (!successful) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'FAILED' },
      });
      throw new AppError('Payment could not be verified', 400);
    }

    return confirmPaidBooking(data.reference);
  },

  async handlePaystackWebhook(rawBody: string, signature: string | undefined, payload: any) {
    if (!verifyPaystackSignature(rawBody, signature)) {
      throw new AppError('Invalid Paystack webhook signature', 401);
    }

    if (payload.event !== 'charge.success') {
      return { received: true, ignored: true };
    }

    const reference = payload.data?.reference;
    if (!reference) throw new AppError('Webhook reference missing', 400);

    return confirmPaidBooking(reference);
  },

  async handleFlutterwaveWebhook(signature: string | undefined, payload: any) {
    if (!verifyFlutterwaveSignature(signature)) {
      throw new AppError('Invalid Flutterwave webhook signature', 401);
    }

    if (payload.event !== 'charge.completed' && payload.status !== 'successful') {
      return { received: true, ignored: true };
    }

    const reference = payload.data?.tx_ref ?? payload.tx_ref;
    if (!reference) throw new AppError('Webhook reference missing', 400);

    return confirmPaidBooking(reference);
  },

  async expirePendingHolds() {
    const expired = await prisma.booking.updateMany({
      where: {
        status: 'PENDING',
        paymentStatus: { in: ['UNPAID', 'PENDING'] },
        createdAt: { lt: activeHoldCutoff() },
      },
      data: {
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
      },
    });

    if (expired.count > 0) {
      await Promise.all([
        cache.delByPattern(CacheKeys.properties.patterns.allLists),
        cache.delByPattern('bookings:*'),
      ]);
    }

    return expired;
  },

  async getBookingById(id: string, userId: string): Promise<BookingResult> {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        id: true,
        checkIn: true,
        checkOut: true,
        totalPrice: true,
        nightsCount: true,
        status: true,
        currency: true,
        paymentStatus: true,
        paymentProvider: true,
        paymentReference: true,
        createdAt: true,
        guestId: true,
        property: {
          select: {
            id: true,
            title: true,
            city: true,
            country: true,
            pricePerNight: true,
            hostId: true,
          },
        },
        guest: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);

    // Only guest or host can view — privacy protection
    const isGuest = booking.guestId === userId;
    const isHost = booking.property.hostId === userId;

    if (!isGuest && !isHost) {
      throw new AppError('Forbidden', 403);
    }

    return {
      ...booking,
      totalPrice: Number(booking.totalPrice),
      property: {
        id: booking.property.id,
        title: booking.property.title,
        city: booking.property.city,
        country: booking.property.country,
        pricePerNight: Number(booking.property.pricePerNight),
      },
    };
  },

  // ─── Get Guest Bookings ────────────────────────────────────────────────────
  async getGuestBookings(
    guestId: string,
    query: BookingQuery
  ): Promise<PaginatedResult<BookingResult>> {
    const pagination = parsePaginationParams(query);
    const cacheKey = CacheKeys.bookings.byGuest(guestId, { ...query, ...pagination });
    const cached = await cache.get<PaginatedResult<BookingResult>>(cacheKey);
    if (cached) return cached;

    const where = {
      guestId,
      ...(query.status && { status: query.status }),
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          nightsCount: true,
          status: true,
          currency: true,
          paymentStatus: true,
          paymentProvider: true,
          paymentReference: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              country: true,
              pricePerNight: true,
            },
          },
          guest: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    const items: BookingResult[] = bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      property: {
        ...b.property,
        pricePerNight: Number(b.property.pricePerNight),
      },
    }));

    const result = paginate(items, total, pagination);
    await cache.set(cacheKey, result, 300);
    return result;
  },

  // ─── Get Property Bookings ─────────────────────────────────────────────────
  async getPropertyBookings(
    propertyId: string,
    hostId: string,
    query: BookingQuery
  ): Promise<PaginatedResult<BookingResult>> {
    const pagination = parsePaginationParams(query);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { hostId: true },
    });

    if (!property) throw new AppError('Property not found', 404);
    if (property.hostId !== hostId) throw new AppError('Forbidden', 403);

    const cacheKey = CacheKeys.bookings.byProperty(propertyId, { ...query, ...pagination });
    const cached = await cache.get<PaginatedResult<BookingResult>>(cacheKey);
    if (cached) return cached;

    const where = {
      propertyId,
      ...(query.status && { status: query.status }),
    };

    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        select: {
          id: true,
          checkIn: true,
          checkOut: true,
          totalPrice: true,
          nightsCount: true,
          status: true,
          currency: true,
          paymentStatus: true,
          paymentProvider: true,
          paymentReference: true,
          createdAt: true,
          property: {
            select: {
              id: true,
              title: true,
              city: true,
              country: true,
              pricePerNight: true,
            },
          },
          guest: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
    ]);

    const items: BookingResult[] = bookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      property: {
        ...b.property,
        pricePerNight: Number(b.property.pricePerNight),
      },
    }));

    const result = paginate(items, total, pagination);
    await cache.set(cacheKey, result, 300);
    return result;
  },

  // ─── Cancel Booking ────────────────────────────────────────────────────────
  async cancelBooking(id: string, guestId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        guestId: true,
        status: true,
        propertyId: true,
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.guestId !== guestId) throw new AppError('Forbidden', 403);

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new AppError(
        `Cannot cancel a booking with status: ${booking.status}`,
        400
      );
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      select: {
        id: true,
        status: true,
        property: {
          select: {
            id: true,
            title: true,
            hostId: true,
          },
        },
        checkIn: true,
        checkOut: true,
        totalPrice: true,
      },
    });

    // ── Invalidate caches ───────────────────────────────────────────────────
    await Promise.all([
      cache.del(CacheKeys.properties.detail(booking.propertyId)),
      cache.delByPattern(CacheKeys.properties.patterns.allLists),
      cache.delByPattern(CacheKeys.bookings.patterns.byGuest(guestId)),
      cache.delByPattern(
        CacheKeys.bookings.patterns.byProperty(booking.propertyId)
      ),
    ]);

    // ── Real-time notification ──────────────────────────────────────────────
    // Notify both guest and host instantly via WebSocket
    // Fire and forget — don't await
    notifyBookingCancelled(
      [guestId, updated.property.hostId ?? ''],
      {
        bookingId: updated.id,
        propertyTitle: updated.property.title,
        cancelledBy: 'guest',
      }
    );

    // ── Email notifications ─────────────────────────────────────────────────
    // Email as fallback — catches users who are offline
    // WebSocket handles online users, email handles offline users
    const [guestData, hostData] = await Promise.all([
      prisma.user.findUnique({
        where: { id: guestId },
        select: { name: true, email: true },
      }),
      prisma.user.findUnique({
        where: { id: updated.property.hostId ?? '' },
        select: { name: true, email: true },
      }),
    ]);

    if (guestData && hostData) {
      await Promise.all([
        sendEmail({
          to: guestData.email,
          subject: `Booking Cancelled: ${updated.property.title}`,
          html: bookingConfirmationTemplate(
            guestData.name,
            updated.property.title,
            updated.checkIn,
            updated.checkOut,
            Number(updated.totalPrice),
            updated.id
          ),
        }),
        sendEmail({
          to: hostData.email,
          subject: `Booking Cancelled: ${updated.property.title}`,
          html: bookingNotificationTemplate(
            hostData.name,
            guestData.name,
            updated.property.title,
            updated.checkIn,
            updated.checkOut,
            Number(updated.totalPrice)
          ),
        }),
      ]);
    }

    return updated;
  },

  // ─── Update Booking Status ─────────────────────────────────────────────────
  async deleteBooking(id: string, guestId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        guestId: true,
        status: true,
        propertyId: true,
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.guestId !== guestId) throw new AppError('Forbidden', 403);

    if (!['CANCELLED', 'COMPLETED'].includes(booking.status)) {
      throw new AppError(
        'Only cancelled or completed bookings can be deleted',
        400
      );
    }

    await prisma.booking.delete({ where: { id } });

    await Promise.all([
      cache.del(CacheKeys.properties.detail(booking.propertyId)),
      cache.delByPattern(CacheKeys.bookings.patterns.byGuest(guestId)),
      cache.delByPattern(CacheKeys.bookings.patterns.byProperty(booking.propertyId)),
    ]);

    return { message: 'Booking deleted successfully' };
  },

  async updateBookingStatus(
    id: string,
    hostId: string,
    data: UpdateBookingStatusInput
  ) {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: {
        status: true,
        propertyId: true,
        guestId: true,
        property: {
          select: { hostId: true },
        },
      },
    });

    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.property.hostId !== hostId) throw new AppError('Forbidden', 403);

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: data.status },
      select: { id: true, status: true, updatedAt: true },
    });

    // ── Invalidate caches ───────────────────────────────────────────────────
    await Promise.all([
      cache.delByPattern(
        CacheKeys.bookings.patterns.byProperty(booking.propertyId)
      ),
      cache.delByPattern(
        CacheKeys.bookings.patterns.byGuest(booking.guestId)
      ),
    ]);

    // ── Real-time notification to guest ────────────────────────────────────
    // When host updates status, guest should know immediately
    if (data.status === 'CONFIRMED') {
      notifyBookingConfirmed(booking.guestId, {
        bookingId: updated.id,
        propertyTitle: 'your property', // you can fetch property title if needed
        checkIn: new Date().toISOString(),
        checkOut: new Date().toISOString(),
      });
    }

    return updated;
  },
};
