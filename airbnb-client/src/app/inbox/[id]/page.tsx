'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { chatApi, Message } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useWebSocket } from '@/lib/websocket';
import { Notification } from '@/types';
import { Send } from 'lucide-react';

export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const handleNotification = useCallback((notification: Notification) => {
    if (notification.type !== 'NEW_MESSAGE') return;
    const data = notification.data as { conversationId?: string; message?: Message };
    if (data.conversationId !== params.id || !data.message) return;

    setMessages((current) => {
      if (data.message?._id && current.some((message) => message._id === data.message?._id)) {
        return current;
      }
      return [...current, data.message as Message];
    });
  }, [params.id]);

  useWebSocket(handleNotification, Boolean(user));

  const loadMessages = useCallback(() => {
    chatApi.messages(params.id).then((response) => setMessages(response.data.messages)).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const interval = window.setInterval(loadMessages, 15000);
    return () => window.clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    const nextContent = content.trim();
    setContent('');
    setSending(true);
    try {
      const response = await chatApi.send(params.id, nextContent);
      setMessages((current) => {
        if (response.data.message._id && current.some((message) => message._id === response.data.message._id)) {
          return current;
        }
        return [...current, response.data.message];
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 p-5">
          <p className="text-sm font-medium text-rose-600">Conversation</p>
          <h1 className="text-xl font-bold text-stone-950">Messages</h1>
        </div>

        <div className="h-[58vh] overflow-y-auto bg-stone-50 p-4 sm:p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-2xl bg-white" />)}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-stone-500">
              No messages yet. Send the first note.
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => {
                const mine = message.senderId === user?.id;
                return (
                  <div key={message._id ?? `${message.createdAt}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-sm ${mine ? 'bg-rose-500 text-white' : 'bg-white text-stone-700'}`}>
                      <p>{message.content}</p>
                      <p className={`mt-1 text-[11px] ${mine ? 'text-rose-100' : 'text-stone-400'}`}>
                        {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(message.createdAt))}
                        {mine ? ` · ${message.readAt ? 'Read by host' : 'Delivered'}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-3 border-t border-stone-200 p-3">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write a message..."
            className="min-w-0 flex-1 rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none focus:border-rose-400"
          />
          <button disabled={sending} className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-5 text-white transition hover:bg-rose-600 disabled:bg-rose-300">
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
