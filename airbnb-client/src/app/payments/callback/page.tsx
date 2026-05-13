'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ApiError, bookingApi } from '@/lib/api';

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'paid' | 'failed'>('verifying');
  const [message, setMessage] = useState('Confirming your payment...');

  const verification = useMemo(() => {
    const providerParam = searchParams.get('provider')?.toUpperCase();
    const provider: 'PAYSTACK' | 'FLUTTERWAVE' =
      providerParam === 'FLUTTERWAVE' ? 'FLUTTERWAVE' : 'PAYSTACK';
    const reference =
      provider === 'FLUTTERWAVE'
        ? searchParams.get('tx_ref')
        : searchParams.get('reference');
    const transactionId = searchParams.get('transaction_id') ?? undefined;
    return { provider, reference, transactionId };
  }, [searchParams]);

  useEffect(() => {
    if (!verification.reference) {
      return;
    }

    bookingApi
      .verifyPayment({
        provider: verification.provider,
        reference: verification.reference,
        transactionId: verification.transactionId,
      })
      .then(() => {
        setStatus('paid');
        setMessage('Payment confirmed. Your booking is now confirmed.');
      })
      .catch((error) => {
        setStatus('failed');
        setMessage(error instanceof ApiError ? error.message : 'Payment could not be verified.');
      });
  }, [verification]);

  if (!verification.reference) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-16 text-center">
        <div>
          <div className="mx-auto h-10 w-10 rounded-full bg-red-500" />
          <h1 className="mt-5 text-2xl font-bold text-stone-950">Payment issue</h1>
          <p className="mt-2 text-stone-500">Payment reference was missing.</p>
          <Link href="/bookings" className="mt-6 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white">
            View bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-4 py-16 text-center">
      <div>
        <div className={`mx-auto h-10 w-10 rounded-full ${status === 'paid' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : 'animate-pulse bg-rose-500'}`} />
        <h1 className="mt-5 text-2xl font-bold text-stone-950">
          {status === 'verifying' ? 'Verifying payment' : status === 'paid' ? 'Booking confirmed' : 'Payment issue'}
        </h1>
        <p className="mt-2 text-stone-500">{message}</p>
        <Link href="/bookings" className="mt-6 inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-white">
          View bookings
        </Link>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <PaymentCallbackContent />
    </Suspense>
  );
}
