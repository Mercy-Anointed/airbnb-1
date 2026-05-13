/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { PropertyListItem } from '@/lib/api';
import { formatNaira } from '@/lib/money';
import { BedDouble, MapPin, Star, Users } from 'lucide-react';

const fallbackImage =
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&auto=format&fit=crop';

export default function PropertyCard({ property }: { property: PropertyListItem }) {
  return (
    <Link
      href={`/properties/${property.id}`}
      className="group block overflow-hidden rounded-2xl bg-white border border-stone-200 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <img
          src={property.primaryImage ?? fallbackImage}
          alt={property.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-stone-800 backdrop-blur">
          {property.type.toLowerCase()}
        </div>
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-800 backdrop-blur">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          {property.averageRating ?? 'New'}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-1 text-base font-semibold text-stone-950">{property.title}</h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
              <MapPin className="h-4 w-4" />
              {property.city}, {property.country}
            </p>
          </div>
          <p className="text-right text-sm font-semibold text-stone-950">
            {formatNaira(property.pricePerNight)}
            <span className="block text-xs font-normal text-stone-500">night</span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-stone-500">
          <span className="flex items-center gap-1 rounded-full bg-stone-50 px-2 py-1">
            <Users className="h-3.5 w-3.5" />
            {property.maxGuests}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-stone-50 px-2 py-1">
            <BedDouble className="h-3.5 w-3.5" />
            {property.bedrooms}
          </span>
          <span className="rounded-full bg-stone-50 px-2 py-1 text-center">
            {property.reviewCount} reviews
          </span>
        </div>
      </div>
    </Link>
  );
}
