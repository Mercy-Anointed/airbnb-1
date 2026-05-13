/* eslint-disable @next/next/no-img-element */
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BookingForm from '@/components/bookings/BookingForm';
import { ApiError, chatApi, propertyApi, PropertyDetails, reviewApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Bath, BedDouble, Home, MapPin, MessageSquare, Send, Star, Users } from 'lucide-react';

const fallbackImage =
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=1200&auto=format&fit=crop';

export default function PropertyDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [property, setProperty] = useState<PropertyDetails | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    let mounted = true;
    propertyApi
      .get(params.id)
      .then((response) => {
        if (mounted) setProperty(response.data);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof ApiError ? err.message : 'Unable to load property.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [params.id]);

  const startChat = async () => {
    if (!property) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setChatLoading(true);
    try {
      const response = await chatApi.start({ hostId: property.host.id, propertyId: property.id });
      router.push(`/inbox/${response.data._id}`);
    } finally {
      setChatLoading(false);
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!property) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    setReviewLoading(true);
    setReviewError('');
    setReviewMessage('');

    try {
      await reviewApi.create({
        propertyId: property.id,
        subjectId: property.host.id,
        rating,
        comment,
      });
      const response = await propertyApi.get(property.id);
      setProperty(response.data);
      setComment('');
      setRating(5);
      setReviewMessage('Thanks. Your review has been posted.');
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : 'Unable to post review.');
    } finally {
      setReviewLoading(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="h-[70vh] animate-pulse rounded-3xl bg-white" /></div>;
  }

  if (error || !property) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><div className="rounded-3xl bg-red-50 p-6 text-red-700">{error || 'Property not found.'}</div></div>;
  }

  const images = property.images.length > 0 ? property.images : [{ id: 'fallback', url: fallbackImage, isPrimary: true }];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-600">{property.type.toLowerCase()} in {property.city}</p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950 sm:text-5xl">{property.title}</h1>
          <p className="mt-3 flex items-center gap-2 text-stone-500">
            <MapPin className="h-5 w-5" />
            {property.address}, {property.city}, {property.country}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 shadow-sm">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {property.averageRating ?? 'New'} · {property._count?.reviews ?? property.reviews.length} reviews
        </div>
      </div>

      <div className="mt-6 grid gap-3 overflow-hidden rounded-3xl md:grid-cols-4 md:grid-rows-2">
        {images.slice(0, 5).map((image, index) => (
          <div key={image.id} className={`${index === 0 ? 'md:col-span-2 md:row-span-2' : ''} min-h-44 bg-stone-100`}>
            <img src={image.url} alt={image.caption ?? property.title} className="h-full w-full object-cover transition duration-500 hover:scale-[1.02]" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="space-y-8">
          <section className="rounded-3xl bg-white border border-stone-200 p-6">
            <div className="flex items-center gap-4 border-b border-stone-100 pb-5">
              <div className="h-12 w-12 rounded-full bg-stone-900 text-white flex items-center justify-center font-semibold">
                {property.host.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-stone-950">Hosted by {property.host.name}</h2>
                <p className="text-sm text-stone-500">Thoughtful listing details and direct messaging enabled.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                { icon: Users, label: `${property.maxGuests} guests` },
                { icon: BedDouble, label: `${property.bedrooms} bedrooms` },
                { icon: Bath, label: `${property.bathrooms} baths` },
                { icon: Home, label: property.type.toLowerCase() },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl bg-stone-50 p-4 text-sm font-medium text-stone-700">
                    <Icon className="mb-2 h-5 w-5 text-rose-500" />
                    {item.label}
                  </div>
                );
              })}
            </div>

            <p className="mt-6 leading-7 text-stone-600">{property.description}</p>
          </section>

          <section className="rounded-3xl bg-white border border-stone-200 p-6">
            <h2 className="text-xl font-bold text-stone-950">Amenities</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {property.amenities.length > 0 ? property.amenities.map((amenity) => (
                <div key={amenity.id} className="rounded-2xl border border-stone-200 px-4 py-3 text-sm text-stone-700">
                  {amenity.name}
                </div>
              )) : (
                <p className="text-sm text-stone-500">No amenities listed yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-stone-200 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-bold text-stone-950">Reviews</h2>
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {property.averageRating ?? 'New'}
              </span>
            </div>

            <form onSubmit={submitReview} className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-stone-950">Rate this home</p>
                  <p className="text-xs text-stone-500">Only customers with completed stays can post.</p>
                </div>
                <div className="flex items-center gap-1" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="rounded-full p-1 text-amber-400 transition hover:bg-white"
                      aria-label={`${value} star${value > 1 ? 's' : ''}`}
                    >
                      <Star className={`h-6 w-6 ${value <= rating ? 'fill-amber-400' : 'fill-transparent'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                minLength={10}
                maxLength={1000}
                rows={4}
                placeholder="Write what future guests should know about this stay"
                className="mt-4 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none focus:border-rose-400"
              />

              {reviewError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</p>}
              {reviewMessage && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm text-green-700">{reviewMessage}</p>}

              <button
                disabled={reviewLoading || comment.trim().length < 10}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:bg-rose-300"
              >
                <Send className="h-4 w-4" />
                {reviewLoading ? 'Posting...' : 'Post review'}
              </button>
            </form>

            <div className="mt-4 grid gap-4">
              {property.reviews.length > 0 ? property.reviews.map((review) => (
                <div key={review.id} className="rounded-2xl bg-stone-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-stone-900">{review.author.name}</p>
                    <span className="text-sm text-stone-500">{review.rating}/5</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{review.comment}</p>
                </div>
              )) : (
                <p className="text-sm text-stone-500">No reviews yet. This stay is ready for its first guest story.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <BookingForm property={property} />
          <button
            onClick={startChat}
            disabled={chatLoading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:opacity-60"
          >
            <MessageSquare className="h-5 w-5" />
            {chatLoading ? 'Opening chat...' : 'Message host'}
          </button>
        </aside>
      </div>
    </div>
  );
}
