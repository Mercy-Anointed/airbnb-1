'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, chatApi, Conversation } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { MessageSquare } from 'lucide-react';

const formatTime = (date?: string) =>
  date ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date)) : 'No messages yet';

export default function InboxPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      chatApi
        .conversations()
        .then((response) => setConversations(response.data))
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to load conversations.'))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, isLoading]);

  if (!isLoading && !isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <MessageSquare className="mx-auto h-10 w-10 text-rose-500" />
        <h1 className="mt-4 text-3xl font-bold text-stone-950">Log in to view messages</h1>
        <p className="mt-2 text-stone-500">Host and guest conversations are private.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white">Log in</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div>
        <p className="text-sm font-medium text-rose-600">Messages</p>
        <h1 className="text-3xl font-bold text-stone-950">Inbox</h1>
        <p className="mt-2 text-stone-500">Continue conversations started from property detail pages.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-24 animate-pulse border-b border-stone-100 bg-white" />)
        ) : error ? (
          <div className="p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-rose-300" />
            <h2 className="mt-3 font-semibold text-stone-950">Unable to load inbox</h2>
            <p className="mt-1 text-sm text-stone-500">{error}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-10 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-stone-300" />
            <h2 className="mt-3 font-semibold text-stone-950">No conversations yet</h2>
            <p className="mt-1 text-sm text-stone-500">Open a property and message the host to start one.</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <Link key={conversation._id} href={`/inbox/${conversation._id}`} className="block border-b border-stone-100 p-5 transition hover:bg-stone-50">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-stone-950">Conversation for property {conversation.propertyId.slice(0, 8)}</h2>
                  <p className="mt-1 truncate text-sm text-stone-500">{conversation.lastMessage ?? 'No messages yet'}</p>
                </div>
                <p className="shrink-0 text-xs text-stone-400">{formatTime(conversation.lastMessageAt)}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
