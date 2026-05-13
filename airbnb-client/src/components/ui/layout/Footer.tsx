import Link from 'next/link';
import { Globe2, Home, Mail, ShieldCheck } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-rose-500 font-bold text-xl">
              <span className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center">
                <Globe2 className="h-5 w-5" />
              </span>
              airbnb
            </Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-stone-500">
              Find thoughtful stays, manage bookings, and stay connected with hosts in one clean workspace.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-900">Explore</h3>
            <div className="mt-3 space-y-2 text-sm text-stone-500">
              <Link href="/properties" className="flex items-center gap-2 hover:text-stone-900">
                <Home className="h-4 w-4" />
                Properties
              </Link>
              <Link href="/bookings" className="flex items-center gap-2 hover:text-stone-900">
                <ShieldCheck className="h-4 w-4" />
                My bookings
              </Link>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-900">Support</h3>
            <div className="mt-3 space-y-2 text-sm text-stone-500">
              <Link href="/inbox" className="flex items-center gap-2 hover:text-stone-900">
                <Mail className="h-4 w-4" />
                Inbox
              </Link>
              <p>Built for mobile, tablet, and desktop flows.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
