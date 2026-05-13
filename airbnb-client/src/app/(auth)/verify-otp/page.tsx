'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi, ApiError, tokenStore } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadUser = useAuthStore((state) => state.loadUser);
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
 // REPLACE with this:
useEffect(() => {
  if (countdown <= 0) {
    const id = setTimeout(() => setCanResend(true), 0);
    return () => clearTimeout(id);
  }
  const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
  return () => clearTimeout(timer);
}, [countdown]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only last digit if pasting
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (newOtp.every(d => d !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code: string) => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const res = await authApi.verifyOtp({ email, otp: code });
      tokenStore.set(res.data.accessToken);
      await loadUser();
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      // Clear OTP inputs on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setResendSuccess(false);
    setError('');

    try {
      await authApi.resendOtp(email);
      setResendSuccess(true);
      setCanResend(false);
      setCountdown(60);
    } catch {
      setError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-rose-600/80 to-rose-900/60" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="text-white font-bold text-3xl tracking-tight">airbnb</Link>
          <div>
            <h2 className="text-white text-4xl font-bold leading-tight mb-4">
              One step away<br />from exploring.
            </h2>
            <p className="text-rose-100 text-lg">
              Verify your email to unlock thousands of unique stays worldwide.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span className="text-rose-500 font-bold text-2xl">airbnb</span>
          </div>

          {/* Icon */}
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
            <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Check your email</h1>
          <p className="text-gray-500 mb-8">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-gray-700">{email}</span>.
            Enter it below to verify your account.
          </p>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Success resend */}
          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 rounded-xl px-4 py-3 text-sm mb-6">
              A new code has been sent to your email.
            </div>
          )}

          {/* OTP Inputs */}
          <div className="flex gap-3 mb-8" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                disabled={loading}
                className={`
                  w-full aspect-square text-center text-2xl font-bold rounded-xl border-2 transition-all
                  focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100
                  disabled:opacity-50
                  ${digit ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-900'}
                `}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={() => handleVerify(otp.join(''))}
            disabled={loading || otp.some(d => d === '')}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-xl py-3.5 transition-colors mb-6"
          >
            {loading ? 'Verifying...' : 'Verify email'}
          </button>

          {/* Resend */}
          <p className="text-center text-sm text-gray-500">
            Didn&apos;t receive a code?{' '}
            {canResend ? (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-rose-500 font-medium hover:underline disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            ) : (
              <span className="text-gray-400">
                Resend in <span className="font-medium text-gray-600">{countdown}s</span>
              </span>
            )}
          </p>

          <p className="text-center text-sm text-gray-400 mt-4">
            Wrong email?{' '}
            <Link href="/register" className="text-rose-500 hover:underline">
              Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
