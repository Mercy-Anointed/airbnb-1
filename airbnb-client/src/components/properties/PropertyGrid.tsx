import { PropertyListItem } from '@/lib/api';
import PropertyCard from './PropertyCard';

export default function PropertyGrid({ properties }: { properties: PropertyListItem[] }) {
  if (properties.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-stone-950">No stays found</h2>
        <p className="mt-2 text-sm text-stone-500">Try a different city, date, or guest count.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {properties.map((property, index) => (
        <div key={property.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}>
          <PropertyCard property={property} />
        </div>
      ))}
    </div>
  );
}
