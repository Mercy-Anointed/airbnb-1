import { bookingService } from '../modules/bookings/booking.service';
import { env } from '../config/env';
import { logger } from '../config/logger';

let interval: NodeJS.Timeout | null = null;
let running = false;

export const startBookingHoldExpiryJob = () => {
  if (interval || env.IS_TEST) return;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      const result = await bookingService.expirePendingHolds();
      if (result.count > 0) {
        logger.info(`Expired ${result.count} pending booking hold(s)`);
      }
    } catch (error) {
      logger.error('Booking hold expiry job failed:', error);
    } finally {
      running = false;
    }
  };

  interval = setInterval(run, 60_000);
  void run();
};

export const stopBookingHoldExpiryJob = () => {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
};
