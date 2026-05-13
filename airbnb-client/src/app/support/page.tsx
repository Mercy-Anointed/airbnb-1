'use client';

import { FormEvent, useState } from 'react';
import { Bot, Send, Sparkles, UserRound } from 'lucide-react';

type SupportMessage = {
  id: string;
  sender: 'customer' | 'support';
  content: string;
};

const knowledgeBase = [
  {
    keywords: ['cancel', 'cancellation', 'refund', 'delete booking', 'remove booking'],
    answer:
      'You can cancel an active booking from your Bookings dashboard. After it becomes cancelled, the Delete button appears in the Cancelled section. Refund handling depends on the property policy and payment provider settlement status.',
  },
  {
    keywords: ['payment', 'pay', 'paid', 'paystack', 'flutterwave', 'charged', 'transaction', 'reference'],
    answer:
      'For payment issues, check whether the booking shows PAID in your Bookings dashboard. If your bank was charged but the booking is still pending, send the booking ID and payment reference so support can verify it against the payment provider.',
  },
  {
    keywords: ['host', 'message', 'contact', 'inbox', 'reply'],
    answer:
      'You can message the host from the property page or from your Inbox. For a booked stay, include the booking ID and dates so the host can quickly identify the reservation.',
  },
  {
    keywords: ['review', 'rating', 'rate', 'stars', 'comment'],
    answer:
      'Reviews are available after your stay is completed. Open the home page, choose your star rating, write your review, and submit it. The system blocks duplicate reviews and reviews from guests who have not completed a stay.',
  },
  {
    keywords: ['admin', 'account', 'role', 'host account', 'become host'],
    answer:
      'Account role changes are handled by an admin. If you want to become a host, contact support with your account email and the admin can upgrade your role after verification.',
  },
  {
    keywords: ['booking', 'pending', 'confirmed', 'completed', 'history', 'trip'],
    answer:
      'Your Bookings dashboard separates trips into Pending, Paid, History, and Cancelled. Pending means the booking is waiting for payment or confirmation. Paid means payment succeeded. History contains completed stays.',
  },
  {
    keywords: ['property', 'home', 'listing', 'amenity', 'price', 'cleaning fee', 'location'],
    answer:
      'For property questions, check the home details page for amenities, address, host information, photos, price per night, and cleaning fee. You can message the host before booking if you need extra details.',
  },
];

const tokenize = (message: string) =>
  message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const buildAutoReply = (message: string) => {
  const normalized = message.toLowerCase();
  const tokens = tokenize(message);

  const matches = knowledgeBase
    .map((entry) => {
      const score = entry.keywords.reduce((total, keyword) => {
        if (normalized.includes(keyword)) return total + 3;
        return total + keyword.split(' ').filter((word) => tokens.includes(word)).length;
      }, 0);
      return { ...entry, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    return matches[0].answer;
  }

  if (message.trim().endsWith('?')) {
    return 'I understand the question. Please include any booking ID, property name, dates, or payment reference connected to it, and support can handle the exact case faster.';
  }

  return 'Thanks, I have captured that. Add the booking ID, property name, dates, and what outcome you want, then support can follow up with the right action.';
};

export default function SupportPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: 'welcome',
      sender: 'support',
      content: 'Hi, I am your support assistant. Ask me anything about bookings, payments, hosts, reviews, or your account.',
    },
  ]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

  const sendMessage = (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const customerMessage: SupportMessage = {
      id: `customer-${Date.now()}`,
      sender: 'customer',
      content: trimmed,
    };

    setMessages((current) => [...current, customerMessage]);
    setDraft('');
    setThinking(true);

    window.setTimeout(() => {
      const supportMessage: SupportMessage = {
        id: `support-${Date.now()}`,
        sender: 'support',
        content: buildAutoReply(trimmed),
      };
      setMessages((current) => [...current, supportMessage]);
      setThinking(false);
    }, 450);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    sendMessage(draft);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-rose-600">Support</p>
          <h1 className="text-3xl font-bold text-stone-950">Chat support</h1>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">
          <Sparkles className="h-4 w-4 text-rose-500" />
          Smart auto reply
        </span>
      </div>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="max-h-[620px] min-h-[520px] space-y-4 overflow-y-auto p-4">
          {messages.map((message) => {
            const isCustomer = message.sender === 'customer';
            return (
              <div key={message.id} className={`flex gap-3 ${isCustomer ? 'justify-end' : 'justify-start'}`}>
                {!isCustomer && (
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                    <Bot className="h-4 w-4" />
                  </span>
                )}
                <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  isCustomer
                    ? 'bg-stone-950 text-white'
                    : 'bg-stone-50 text-stone-700'
                }`}>
                  {message.content}
                </div>
                {isCustomer && (
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-700">
                    <UserRound className="h-4 w-4" />
                  </span>
                )}
              </div>
            );
          })}

          {thinking && (
            <div className="flex gap-3">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <Bot className="h-4 w-4" />
              </span>
              <div className="rounded-2xl bg-stone-50 px-4 py-3 text-sm text-stone-500">Thinking...</div>
            </div>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-3 border-t border-stone-200 p-4">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a question"
            className="h-12 flex-1 rounded-2xl border border-stone-200 px-4 text-sm outline-none focus:border-rose-400"
          />
          <button
            disabled={!draft.trim() || thinking}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-rose-500 px-5 text-sm font-semibold text-white hover:bg-rose-600 disabled:bg-rose-300"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
