'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ApiError, Booking, bookingApi, propertyApi, PropertyListItem } from '@/lib/api';
import { formatNaira } from '@/lib/money';
import { useAuthStore } from '@/store/auth.store';
import PropertyCard from '@/components/properties/PropertyCard';
import { BarChart3, CalendarDays, Clock3, Home, MessageCircle, Plus, Star, TrendingUp, Users, WalletCards } from 'lucide-react';

const initialForm = {
  title: '',
  description: '',
  type: 'APARTMENT',
  pricePerNight: 120000,
  cleaningFee: 20000,
  maxGuests: 2,
  bedrooms: 1,
  bathrooms: 1,
  address: '',
  city: '',
  country: '',
  latitude: 0,
  longitude: 0,
  amenities: 'WiFi,Kitchen,Air conditioning',
};

const statusLabels = [
  { label: 'Pending approval', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
] as const;

const isWithinDays = (date: string, days: number) => {
  const time = new Date(date).getTime();
  const now = Date.now();
  return time >= now && time <= now + days * 86400000;
};

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const paidBookings = hostBookings.filter((booking) => booking.paymentStatus === 'PAID');
  const bookedNights = paidBookings.reduce((total, booking) => total + booking.nightsCount, 0);
  const revenue = paidBookings.reduce((total, booking) => total + booking.totalPrice, 0);
  const occupancyBase = Math.max(properties.length * 30, 1);
  const occupancyRate = Math.min(100, Math.round((bookedNights / occupancyBase) * 100));
  const averageDailyRate = bookedNights > 0 ? revenue / bookedNights : 0;
  const upcomingCheckIns = hostBookings.filter((booking) => booking.status !== 'CANCELLED' && isWithinDays(booking.checkIn, 7)).length;
  const upcomingCheckOuts = hostBookings.filter((booking) => booking.status !== 'CANCELLED' && isWithinDays(booking.checkOut, 7)).length;
  const reviewAverage = properties.length > 0
    ? properties.reduce((total, property) => total + (property.averageRating ?? 0), 0) / properties.filter((property) => property.averageRating !== null).length || 0
    : 0;
  const pipelineCounts = statusLabels.map((status) => ({
    ...status,
    count: hostBookings.filter((booking) => booking.status === status.value).length,
  }));

  const loadProperties = useCallback(() => {
    if (!user) return;
    propertyApi.hostProperties(user.id).then(async (response) => {
      setProperties(response.data);
      const bookingResponses = await Promise.all(
        response.data.map((property) => bookingApi.propertyBookings(property.id, { limit: 20 }).catch(() => null))
      );
      setHostBookings(
        bookingResponses.flatMap((bookingResponse) => bookingResponse?.data.data ?? [])
      );
    }).catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (user?.role === 'HOST' || user?.role === 'ADMIN') loadProperties();
  }, [user, loadProperties]);

  const updateForm = (key: keyof typeof initialForm, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: ['pricePerNight', 'cleaningFee', 'maxGuests', 'bedrooms', 'bathrooms', 'latitude', 'longitude'].includes(key)
        ? Number(value)
        : value,
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (form.description.length < 50) {
      setError('Description must be at least 50 characters.');
      setLoading(false);
      return;
    }

    try {
      const response = await propertyApi.create({
        ...form,
        amenities: form.amenities.split(',').map((item) => item.trim()).filter(Boolean),
      });

      if (image && response.data.id) {
        const data = new FormData();
        data.append('image', image);
        data.append('isPrimary', 'true');
        await propertyApi.uploadImage(response.data.id, data);
      }

      setMessage('Property created successfully.');
      setForm(initialForm);
      setImage(null);
      loadProperties();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create property.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-stone-950">Log in to host</h1>
        <p className="mt-2 text-stone-500">Host tools are available after authentication.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white">Log in</Link>
      </div>
    );
  }

  if (user && user.role === 'GUEST') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Home className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-3xl font-bold text-stone-950">Host account required</h1>
        <p className="mt-2 text-stone-500">Create a HOST account to list and manage properties.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-600">Host dashboard</p>
          <h1 className="text-3xl font-bold text-stone-950">Manage your stays</h1>
          <p className="mt-2 text-stone-500">Create listings that match the backend property schema exactly.</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">
          {properties.length} active listings
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Occupancy rate', value: `${occupancyRate}%`, meta: '30-day portfolio estimate', icon: BarChart3 },
          { label: 'Paid revenue', value: formatNaira(revenue), meta: `${paidBookings.length} paid bookings`, icon: WalletCards },
          { label: 'Average daily rate', value: formatNaira(averageDailyRate), meta: `${bookedNights} booked nights`, icon: TrendingUp },
          { label: 'Review score', value: reviewAverage ? reviewAverage.toFixed(1) : 'New', meta: 'Average listing rating', icon: Star },
        ].map(({ label, value, meta, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
              <Icon className="h-5 w-5 text-rose-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-stone-950">{value}</p>
            <p className="mt-1 text-sm text-stone-500">{meta}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-stone-950">Booking pipeline</h2>
              <p className="mt-1 text-sm text-stone-500">Reservations grouped by the operational stages in the product spec.</p>
            </div>
            <Clock3 className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {pipelineCounts.map((stage) => (
              <div key={stage.value} className="rounded-2xl bg-stone-50 p-4">
                <p className="text-2xl font-bold text-stone-950">{stage.count}</p>
                <p className="mt-1 text-xs font-semibold text-stone-500">{stage.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-950">Next 7 days</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-700">{upcomingCheckIns}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-700">Check-ins</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-2xl font-bold text-blue-700">{upcomingCheckOuts}</p>
              <p className="mt-1 text-xs font-semibold text-blue-700">Check-outs</p>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
            <MessageCircle className="mt-0.5 h-4 w-4 text-stone-500" />
            <p className="text-sm text-stone-600">Use Inbox for pre-stay questions and check-in coordination.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="h-fit rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-stone-950">
            <Plus className="h-5 w-5 text-rose-500" />
            New property
          </h2>

          <div className="mt-5 grid gap-4">
            {[
              ['title', 'Title'],
              ['address', 'Address'],
              ['city', 'City'],
              ['country', 'Country'],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-semibold text-stone-500">{label}</span>
                <input
                  value={String(form[key as keyof typeof form])}
                  onChange={(event) => updateForm(key as keyof typeof initialForm, event.target.value)}
                  className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-rose-400"
                />
              </label>
            ))}

            <label>
              <span className="text-xs font-semibold text-stone-500">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                rows={4}
                className={`mt-1 w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:border-rose-400 ${
                  form.description.length > 0 && form.description.length < 50
                    ? 'border-red-300'
                    : 'border-stone-200'
                }`}
              />
              <p className={`mt-1 text-xs ${
                form.description.length === 0
                  ? 'text-stone-400'
                  : form.description.length < 50
                  ? 'text-red-500'
                  : 'text-green-600'
              }`}>
                {form.description.length}/50 minimum characters
                {form.description.length > 0 && form.description.length < 50 && ' — too short'}
                {form.description.length >= 50 && ' ✓'}
              </p>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs font-semibold text-stone-500">Type</span>
                <select value={form.type} onChange={(event) => updateForm('type', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none">
                  {['APARTMENT', 'HOUSE', 'VILLA', 'CABIN', 'STUDIO', 'LOFT'].map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Price per night (NGN)</span>
                <input type="number" value={form.pricePerNight} onChange={(event) => updateForm('pricePerNight', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Cleaning fee (NGN)</span>
                <input type="number" value={form.cleaningFee} onChange={(event) => updateForm('cleaningFee', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Guests</span>
                <input type="number" value={form.maxGuests} onChange={(event) => updateForm('maxGuests', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Bedrooms</span>
                <input type="number" value={form.bedrooms} onChange={(event) => updateForm('bedrooms', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Bathrooms</span>
                <input type="number" value={form.bathrooms} onChange={(event) => updateForm('bathrooms', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Latitude</span>
                <input type="number" value={form.latitude} onChange={(event) => updateForm('latitude', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-500">Longitude</span>
                <input type="number" value={form.longitude} onChange={(event) => updateForm('longitude', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
              </label>
            </div>

            <label>
              <span className="text-xs font-semibold text-stone-500">Amenities comma-separated</span>
              <input value={form.amenities} onChange={(event) => updateForm('amenities', event.target.value)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none" />
            </label>

            <label>
              <span className="text-xs font-semibold text-stone-500">Primary image</span>
              <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} className="mt-1 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm" />
            </label>
          </div>

          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {message && <p className="mt-4 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

          <button
            disabled={loading}
            className="mt-5 w-full rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:bg-rose-300"
          >
            {loading ? 'Creating...' : 'Create property'}
          </button>
        </form>

        <div>
          <h2 className="text-xl font-bold text-stone-950">Your listings</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {properties.length > 0 ? properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            )) : (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center md:col-span-2">
                <p className="font-semibold text-stone-950">No listings yet</p>
                <p className="mt-2 text-sm text-stone-500">Create your first property from the form.</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-xl font-bold text-stone-950">
              <Users className="h-5 w-5 text-rose-500" />
              Customers
            </h2>
            <div className="mt-4 grid gap-3">
              {hostBookings.length > 0 ? hostBookings.slice(0, 8).map((booking) => (
                <div key={booking.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-stone-950">{booking.guest.name}</p>
                      <p className="mt-1 text-sm text-stone-500">{booking.property.title}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-stone-100 px-3 py-1 font-semibold text-stone-600">{booking.status}</span>
                      <span className="inline-flex items-center gap-1 text-stone-500">
                        <CalendarDays className="h-4 w-4" />
                        {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(booking.checkIn))}
                      </span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
                  <p className="font-semibold text-stone-950">No customer bookings yet</p>
                  <p className="mt-2 text-sm text-stone-500">Bookings for your properties will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
