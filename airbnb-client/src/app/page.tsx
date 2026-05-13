import Link from 'next/link';
import { Suspense } from 'react';
import SearchBar from '@/components/properties/SearchBar';
import { ArrowRight, CalendarCheck, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-stone-950 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-55"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1800&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/50 via-stone-950/45 to-stone-950" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex flex-col justify-end pb-10 pt-24">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
              <Sparkles className="h-4 w-4 text-rose-200" />
              Stays, bookings, and host messaging in one place
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-normal sm:text-6xl lg:text-7xl">
              Find a stay that feels easy from the first search.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-200 sm:text-lg">
              Explore available homes, book with protected account sessions, and message hosts without losing your place.
            </p>
          </div>

          <div className="mt-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <Suspense>
              <SearchBar />
            </Suspense>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: 'Verified account flow', text: 'OTP and Google auth both map to backend tokens.' },
              { icon: CalendarCheck, label: 'Live booking rules', text: 'Availability and cancellation use the API service layer.' },
              { icon: MessageCircle, label: 'Host conversations', text: 'Start chats from properties and continue in inbox.' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <Icon className="h-5 w-5 text-rose-200" />
                  <h2 className="mt-3 text-sm font-semibold">{item.label}</h2>
                  <p className="mt-1 text-sm text-stone-300">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-950">Ready to explore?</h2>
            <p className="mt-2 text-stone-500">Go straight to the marketplace and filter with real backend search params.</p>
          </div>
          <Link href="/properties" className="inline-flex items-center justify-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">
            Browse stays
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
