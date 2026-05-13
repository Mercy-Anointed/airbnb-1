'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { CalendarDays, MapPin, Search, Users } from 'lucide-react';

export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [city, setCity] = useState(params.get('city') ?? '');
  const [guests, setGuests] = useState(params.get('maxGuests') ?? '');
  const [checkIn, setCheckIn] = useState(params.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(params.get('checkOut') ?? '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (city) query.set('city', city);
    if (guests) query.set('maxGuests', guests);
    if (checkIn) query.set('checkIn', checkIn);
    if (checkOut) query.set('checkOut', checkOut);
    router.push(`/properties?${query.toString()}`);
  };

  return (
    <form onSubmit={submit} className="glass-panel grid gap-3 rounded-3xl border border-white/70 p-3 shadow-2xl md:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]">
      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <MapPin className="h-5 w-5 text-rose-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-stone-500">Where</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="City or destination"
            className="w-full bg-transparent text-sm outline-none"
          />
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <CalendarDays className="h-5 w-5 text-rose-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-stone-500">Check in</span>
          <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="w-full bg-transparent text-sm outline-none" />
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <CalendarDays className="h-5 w-5 text-rose-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-stone-500">Check out</span>
          <input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="w-full bg-transparent text-sm outline-none" />
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
        <Users className="h-5 w-5 text-rose-500" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-stone-500">Guests</span>
          <input value={guests} onChange={(event) => setGuests(event.target.value)} type="number" min="1" placeholder="2" className="w-full bg-transparent text-sm outline-none" />
        </span>
      </label>

      <button className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-600">
        <Search className="h-5 w-5" />
        Search
      </button>
    </form>
  );
}
