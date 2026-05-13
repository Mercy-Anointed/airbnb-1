import { wsManager } from "../config/websocket";

// ── Booking Notifications ─────────────────────────────────────────────────────
export const notifyBookingConfirmed = (
  guestId: string,
  data: {
    bookingId: string;
    propertyTitle: string;
    checkIn: string;
    checkOut: string;
  }
) => {
  wsManager.sendToUser(guestId, {
    type: 'BOOKING_CONFIRMED',
    title: 'Booking Confirmed!',
    message: `Your booking for ${data.propertyTitle} has been confirmed.`,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const notifyNewBookingRequest = (
  hostId: string,
  data: {
    bookingId: string;
    propertyTitle: string;
    guestName: string;
  }
) => {
  wsManager.sendToUser(hostId, {
    type: 'BOOKING_PENDING',
    title: 'New Booking Request',
    message: `${data.guestName} wants to book ${data.propertyTitle}.`,
    data,
    timestamp: new Date().toISOString(),
  });
};

// ── This was missing — booking service needs it ───────────────────────────────
// Takes an ARRAY of userIds because both guest AND host need to be notified
// when a booking is cancelled — one call handles both
export const notifyBookingCancelled = (
  userIds: string[],
  data: {
    bookingId: string;
    propertyTitle: string;
    cancelledBy: string;
  }
) => {
  wsManager.sendToUsers(userIds, {
    type: 'BOOKING_CANCELLED',
    title: 'Booking Cancelled',
    message: `A booking for ${data.propertyTitle} has been cancelled.`,
    data,
    timestamp: new Date().toISOString(),
  });
};

// ── Review Notifications ──────────────────────────────────────────────────────
export const notifyNewReview = (
  hostId: string,
  data: {
    propertyTitle: string;
    rating: number;
    guestName: string;
  }
) => {
  wsManager.sendToUser(hostId, {
    type: 'NEW_REVIEW',
    title: 'New Review Received',
    message: `${data.guestName} left a ${data.rating}-star review on ${data.propertyTitle}.`,
    data,
    timestamp: new Date().toISOString(),
  });
};