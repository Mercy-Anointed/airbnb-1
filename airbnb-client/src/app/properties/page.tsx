'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/properties/SearchBar';
import PropertyGrid from '@/components/properties/PropertyGrid';
import { ApiError, propertyApi, PropertyListItem } from '@/lib/api';
import { SlidersHorizontal } from 'lucide-react';

function PropertiesContent() {
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = useMemo(() => {
    const getNumber = (key: string) => {
      const value = searchParams.get(key);
      return value ? Number(value) : undefined;
    };

    return {
      city: searchParams.get('city') ?? undefined,
      country: searchParams.get('country') ?? undefined,
      maxGuests: getNumber('maxGuests'),
      minPrice: getNumber('minPrice'),
      maxPrice: getNumber('maxPrice'),
      checkIn: searchParams.get('checkIn') ?? undefined,
      checkOut: searchParams.get('checkOut') ?? undefined,
      sortBy: (searchParams.get('sortBy') as 'pricePerNight' | 'createdAt' | 'maxGuests') ?? 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') ?? 'desc',
      limit: 24,
    };
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;

    propertyApi
      .list(query)
      .then((response) => {
        if (mounted) setProperties(response.data.data);
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof ApiError ? err.message : 'Unable to load properties.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="rounded-[2rem] bg-stone-950 p-5 sm:p-8 text-white overflow-hidden relative">
        <div
          className="absolute inset-0 opacity-35 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1494526585095-c41746248156?w=1600&auto=format&fit=crop')" }}
        />
        <div className="relative">
          <p className="text-sm font-medium text-rose-200">Explore stays</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold sm:text-5xl">Homes that match your trip, not just your filters.</h1>
          <div className="mt-6">
            <SearchBar />
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-950">Available stays</h2>
          <p className="text-sm text-stone-500">
            {loading ? 'Searching live inventory...' : `${properties.length} listings loaded`}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600">
          <SlidersHorizontal className="h-4 w-4" />
          Sorted by newest
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-2xl bg-white border border-stone-200" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-red-50 border border-red-100 p-6 text-red-700">{error}</div>
        ) : (
          <PropertyGrid properties={properties} />
        )}
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense>
      <PropertiesContent />
    </Suspense>
  );
}
