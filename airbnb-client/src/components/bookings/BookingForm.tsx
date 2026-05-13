'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, bookingApi, PropertyDetails } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CalendarCheck } from 'lucide-react';
import { formatNaira } from '@/lib/money';

const nightsBetween = (checkIn: string, checkOut: string) => {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000));
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export default function BookingForm({ property }: { property: PropertyDetails }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const today = useMemo(() => todayInputValue(), []);
  const subtotal = nights * property.pricePerNight;
  const total = subtotal + property.cleaningFee;
  const canBook = isAuthenticated && user?.role !== 'HOST' && nights > 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!canBook) {
      setError('Choose valid dates before booking.');
      return;
    }

    setLoading(true);
    try {
      const booking = await bookingApi.create({ propertyId: property.id, checkIn, checkOut });
      const payment = await bookingApi.initializePayment(booking.data.id, 'PAYSTACK');
      window.location.href = payment.data.authorizationUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-stone-950">{formatNaira(property.pricePerNight)}</p>
          <p className="text-sm text-stone-500">per night</p>
        </div>
        <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-medium text-rose-600">
          {property.averageRating ?? 'New'} rating
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-2xl border border-stone-200">
        <label className="border-r border-stone-200 p-3">
          <span className="block text-xs font-semibold text-stone-500">Check in</span>
          <input
            type="date"
            min={today}
            value={checkIn}
            onChange={(event) => {
              setCheckIn(event.target.value);
              if (checkOut && event.target.value >= checkOut) setCheckOut('');
            }}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="p-3">
          <span className="block text-xs font-semibold text-stone-500">Check out</span>
          <input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className="mt-1 w-full bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      {nights > 0 && (
        <div className="mt-5 space-y-3 text-sm text-stone-600">
          <div className="flex justify-between">
            <span>{formatNaira(property.pricePerNight)} x {nights} nights</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Cleaning fee</span>
            <span>{formatNaira(property.cleaningFee)}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-3 font-semibold text-stone-950">
            <span>Total</span>
            <span>{formatNaira(total)}</span>
          </div>
        </div>
      )}

      {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {message && <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

      <button
        disabled={loading}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:bg-rose-300"
      >
        <CalendarCheck className="h-5 w-5" />
        {loading ? 'Opening payment...' : isAuthenticated ? 'Pay with Paystack' : 'Log in to reserve'}
      </button>
    </form>
  );
}
