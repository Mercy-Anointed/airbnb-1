'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, Booking, bookingApi } from '@/lib/api';
import { formatNaira } from '@/lib/money';
import { useAuthStore } from '@/store/auth.store';
import { CalendarDays, Clock3, CreditCard, History, MapPin, Trash2, XCircle } from 'lucide-react';

type BookingTab = 'pending' | 'paid' | 'previous' | 'cancelled';

const tabs: Array<{ id: BookingTab; label: string; icon: typeof Clock3 }> = [
  { id: 'pending', label: 'Pending', icon: Clock3 },
  { id: 'paid', label: 'Paid', icon: CreditCard },
  { id: 'previous', label: 'History', icon: History },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));

const isPastStay = (booking: Booking) =>
  booking.status === 'COMPLETED' || new Date(booking.checkOut).getTime() < Date.now();

export default function BookingsPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<BookingTab>('pending');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  const loadBookings = () => {
    setLoading(true);
    setError('');
    bookingApi
      .mine({ limit: 100 })
      .then((response) => setBookings(response.data.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load bookings.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated) loadBookings();
    if (!isLoading && !isAuthenticated) setLoading(false);
  }, [isAuthenticated, isLoading]);

  const groups = useMemo(() => ({
    pending: bookings.filter((booking) => booking.status === 'PENDING'),
    paid: bookings.filter((booking) => booking.paymentStatus === 'PAID' && !isPastStay(booking) && booking.status !== 'CANCELLED'),
    previous: bookings.filter((booking) => isPastStay(booking) && booking.status !== 'CANCELLED'),
    cancelled: bookings.filter((booking) => booking.status === 'CANCELLED'),
  }), [bookings]);

  const cancelBooking = async (bookingId: string) => {
    setActionId(bookingId);
    setError('');
    try {
      await bookingApi.cancel(bookingId);
      loadBookings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to cancel booking.');
    } finally {
      setActionId('');
    }
  };

  const deleteBooking = async (bookingId: string) => {
    setActionId(bookingId);
    setError('');
    try {
      await bookingApi.delete(bookingId);
      loadBookings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete booking.');
    } finally {
      setActionId('');
    }
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-stone-950">Log in to view bookings</h1>
        <p className="mt-2 text-stone-500">Your trips are protected behind your account session.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white">Log in</Link>
      </div>
    );
  }

  const visibleBookings = groups[activeTab];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-600">Guest dashboard</p>
          <h1 className="text-3xl font-bold text-stone-950">Bookings</h1>
        </div>
        <Link href="/properties" className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white">Book another stay</Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              activeTab === id
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span className="text-lg font-bold">{groups[id].length}</span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl bg-white" />)
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-5 text-red-700">{error}</div>
        ) : visibleBookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-stone-950">Nothing here yet</h2>
            <p className="mt-2 text-sm text-stone-500">This section updates as your bookings move through their lifecycle.</p>
          </div>
        ) : (
          visibleBookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">{booking.status}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{booking.paymentStatus}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-stone-950">{booking.property.title}</h2>
                  <p className="mt-1 flex items-center gap-2 text-sm text-stone-500">
                    <MapPin className="h-4 w-4" />
                    {booking.property.city}, {booking.property.country}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                  <div className="rounded-2xl bg-stone-50 p-3">
                    <CalendarDays className="h-4 w-4 text-rose-500" />
                    <p className="mt-2 text-xs text-stone-500">Dates</p>
                    <p className="text-sm font-semibold text-stone-900">{formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">Nights</p>
                    <p className="mt-2 text-lg font-bold text-stone-950">{booking.nightsCount}</p>
                  </div>
                  <div className="rounded-2xl bg-stone-50 p-3">
                    <p className="text-xs text-stone-500">Total</p>
                    <p className="mt-2 text-lg font-bold text-stone-950">{formatNaira(booking.totalPrice)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                  <button
                    disabled={actionId === booking.id}
                    onClick={() => cancelBooking(booking.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle className="h-4 w-4" />
                    Cancel
                  </button>
                )}
                {['CANCELLED', 'COMPLETED'].includes(booking.status) && (
                  <button
                    disabled={actionId === booking.id}
                    onClick={() => deleteBooking(booking.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
