'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

function AppInitializer() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const hasRun = useRef(false);

  useEffect(() => {
    // Only run once — prevent infinite loop
    if (hasRun.current) return;
    hasRun.current = true;
    void loadUser().catch(() => undefined);
  }, [loadUser]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <AppInitializer />
      {children}
    </QueryClientProvider>
  );
}
