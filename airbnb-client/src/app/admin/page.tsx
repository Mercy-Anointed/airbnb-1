'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, PublicProfile, userApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { BarChart3, CircleDollarSign, ClipboardList, Search, ShieldCheck, Siren, Trash2, UserCog, Users } from 'lucide-react';

const roles: Array<PublicProfile['role'] | 'ALL'> = ['ALL', 'GUEST', 'HOST', 'ADMIN'];

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [role, setRole] = useState<PublicProfile['role'] | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState('');
  const [error, setError] = useState('');

  const hostCount = users.filter((account) => account.role === 'HOST').length;
  const guestCount = users.filter((account) => account.role === 'GUEST').length;
  const adminCount = users.filter((account) => account.role === 'ADMIN').length;
  const listingCount = users.reduce((total, account) => total + account.totalProperties, 0);
  const reviewCount = users.reduce((total, account) => total + account.totalReviews, 0);

  const loadUsers = () => {
    setLoading(true);
    setError('');
    userApi
      .list({ limit: 100, role: role === 'ALL' ? undefined : role, search })
      .then((response) => setUsers(response.data.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load users.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'ADMIN') loadUsers();
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) setLoading(false);
  }, [isAuthenticated, isLoading, role, user?.role]);

  const changeRole = async (targetUser: PublicProfile, nextRole: PublicProfile['role']) => {
    setActionId(targetUser.id);
    try {
      await userApi.updateRole(targetUser.id, nextRole);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update role.');
    } finally {
      setActionId('');
    }
  };

  const deleteUser = async (targetUser: PublicProfile) => {
    setActionId(targetUser.id);
    try {
      await userApi.delete(targetUser.id);
      loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete user.');
    } finally {
      setActionId('');
    }
  };

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-stone-950">Admin login required</h1>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white">Log in</Link>
      </div>
    );
  }

  if (!isLoading && user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-3xl font-bold text-stone-950">Admins only</h1>
        <p className="mt-2 text-stone-500">This panel manages hosts, guests, and account roles.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-600">Admin panel</p>
          <h1 className="text-3xl font-bold text-stone-950">Users and hosts</h1>
          <p className="mt-2 text-stone-500">Govern accounts, host access, listing supply, and marketplace health.</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">{users.length} accounts</span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Active users', value: users.length, meta: `${guestCount} guests · ${hostCount} hosts`, icon: Users },
          { label: 'Listing supply', value: listingCount, meta: 'Hosted properties', icon: ClipboardList },
          { label: 'Reviews', value: reviewCount, meta: 'Marketplace trust signals', icon: BarChart3 },
          { label: 'Admin seats', value: adminCount, meta: 'Operator access', icon: ShieldCheck },
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

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Siren className="h-5 w-5 text-rose-500" />
            <h2 className="font-bold text-stone-950">Trust queue</h2>
          </div>
          <p className="mt-3 text-3xl font-bold text-stone-950">0</p>
          <p className="mt-1 text-sm text-stone-500">Open disputes and flagged reviews</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-rose-500" />
            <h2 className="font-bold text-stone-950">Payout queue</h2>
          </div>
          <p className="mt-3 text-3xl font-bold text-stone-950">Manual</p>
          <p className="mt-1 text-sm text-stone-500">Payment provider settlement remains external</p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-rose-500" />
            <h2 className="font-bold text-stone-950">Role operations</h2>
          </div>
          <p className="mt-3 text-3xl font-bold text-stone-950">Live</p>
          <p className="mt-1 text-sm text-stone-500">Promote guests, manage hosts, soft-delete accounts</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row">
        <label className="flex flex-1 items-center gap-2 rounded-2xl border border-stone-200 px-3">
          <Search className="h-4 w-4 text-stone-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && loadUsers()}
            placeholder="Search name or email"
            className="h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="rounded-2xl border border-stone-200 px-4 text-sm font-semibold outline-none">
          {roles.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button onClick={loadUsers} className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white">Search</button>
      </div>

      {error && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="grid grid-cols-[1.4fr_120px_120px_150px_120px] border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-bold uppercase text-stone-500">
          <span>User</span>
          <span>Role</span>
          <span>Listings</span>
          <span>Reviews</span>
          <span>Actions</span>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-stone-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-sm text-stone-500">No users found.</div>
        ) : (
          users.map((account) => (
            <div key={account.id} className="grid grid-cols-1 gap-3 border-b border-stone-100 px-4 py-4 last:border-b-0 md:grid-cols-[1.4fr_120px_120px_150px_120px] md:items-center">
              <div className="min-w-0">
                <p className="truncate font-semibold text-stone-950">{account.name}</p>
                <p className="truncate text-xs text-stone-500">{account.id}</p>
              </div>
              <select
                value={account.role}
                disabled={actionId === account.id || account.id === user?.id}
                onChange={(event) => changeRole(account, event.target.value as PublicProfile['role'])}
                className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold outline-none disabled:opacity-60"
              >
                {roles.filter((item) => item !== 'ALL').map((item) => <option key={item}>{item}</option>)}
              </select>
              <span className="text-sm text-stone-700">{account.totalProperties}</span>
              <span className="text-sm text-stone-700">{account.totalReviews}</span>
              <button
                disabled={actionId === account.id || account.id === user?.id}
                onClick={() => deleteUser(account)}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
              >
                {account.role === 'HOST' ? <UserCog className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
