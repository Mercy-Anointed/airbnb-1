'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import {
  Calendar,
  Globe2,
  Home,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/properties', label: 'Explore', icon: Search },
  { href: '/bookings', label: 'Bookings', icon: Calendar, auth: true },
  { href: '/inbox', label: 'Inbox', icon: MessageSquare, auth: true },
  { href: '/support', label: 'Support', icon: LifeBuoy },
];

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname.startsWith('/verify-otp') || pathname.startsWith('/auth/callback');

  if (isAuthPage) return null;

  const visibleItems = navItems.filter((item) => !item.auth || isAuthenticated);

  return (
    <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="h-9 w-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-sm">
              <Globe2 className="h-5 w-5" />
            </span>
            <span className="text-rose-500 font-bold text-xl">airbnb</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 p-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-950'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            {isAuthenticated && (user?.role === 'HOST' || user?.role === 'ADMIN') && (
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname.startsWith('/dashboard') ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-950'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
            {isAuthenticated && user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname.startsWith('/admin') ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500 hover:text-stone-950'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="hidden h-10 w-24 rounded-full bg-stone-100 md:block" />
            ) : isAuthenticated ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setUserMenuOpen((value) => !value)}
                  className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-2 py-1.5 shadow-sm transition hover:shadow-md"
                  aria-label="Open user menu"
                  aria-expanded={userMenuOpen}
                >
                  <Menu className="h-5 w-5 text-stone-600" />
                  <span className="h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <Image src={user.avatar} alt={user.name} width={32} height={32} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl animate-fade-up">
                    <div className="px-4 py-4 border-b border-stone-100">
                      <p className="text-sm font-semibold text-stone-950">{user?.name}</p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                      <span className="mt-2 inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                        {user?.role}
                      </span>
                    </div>
                    <div className="py-2">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                      {(user?.role === 'HOST' || user?.role === 'ADMIN') && (
                        <Link
                          href="/dashboard"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
                        >
                          <Home className="h-4 w-4" />
                          Host dashboard
                        </Link>
                      )}
                      {user?.role === 'ADMIN' && (
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-stone-700 hover:bg-stone-50"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Admin panel
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          logout();
                        }}
                        className="flex w-full items-center gap-3 border-t border-stone-100 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="hidden sm:inline-flex rounded-full px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
                  Log in
                </Link>
                <Link href="/register" className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800">
                  Sign up
                </Link>
              </>
            )}

            <button
              onClick={() => setMobileNavOpen((value) => !value)}
              className="md:hidden rounded-full border border-stone-200 p-2 text-stone-700"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-stone-100 py-3 md:hidden">
            <div className="grid gap-1">
              {isAuthenticated && (
                <div className="mb-2 rounded-2xl bg-stone-50 px-4 py-3">
                  <p className="text-sm font-semibold text-stone-950">{user?.name}</p>
                  <p className="truncate text-xs text-stone-500">{user?.email}</p>
                </div>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                      active ? 'bg-stone-100 text-stone-950' : 'text-stone-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
              {isAuthenticated && (user?.role === 'HOST' || user?.role === 'ADMIN') && (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                    pathname.startsWith('/dashboard') ? 'bg-stone-100 text-stone-950' : 'text-stone-600'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              )}
              {isAuthenticated && user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                    pathname.startsWith('/admin') ? 'bg-stone-100 text-stone-950' : 'text-stone-600'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}
              {!isLoading && !isAuthenticated && (
                <Link
                  href="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-stone-600"
                >
                  <User className="h-4 w-4" />
                  Log in
                </Link>
              )}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
