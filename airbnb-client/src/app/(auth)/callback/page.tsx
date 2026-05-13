'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeOAuthLogin = useAuthStore((state) => state.completeOAuthLogin);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      router.replace('/login?error=oauth_failed');
      return;
    }

    completeOAuthLogin(accessToken)
      .then(() => {
        router.replace('/');
      })
      .catch(() => {
        router.replace('/login?error=oauth_failed');
      });
  }, [searchParams, router, completeOAuthLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackContent />
    </Suspense>
  );
}
