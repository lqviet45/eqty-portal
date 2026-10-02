'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/Toast';
import { isApiError } from '@/lib/api/errors';
import { AuthProvider } from '@/lib/auth/AuthProvider';

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // Retry only what may be transient (no answer, 5xx); a 4xx would just repeat.
        retry: (failures, error) => failures < 2 && isApiError(error) && (error.status === 0 || error.status >= 500),
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
