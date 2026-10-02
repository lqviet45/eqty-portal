'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useMessages } from '@/lib/i18n';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function FullScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-slate-600">{children}</div>;
}

/** Sends visitors who are not signed in to Keycloak and renders its children only once they are. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const m = useMessages();
  const auth = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (auth.status === 'unauthenticated' && !started.current) {
      started.current = true;
      void auth.login();
    }
  }, [auth]);

  if (auth.status === 'authenticated') {
    return <>{children}</>;
  }
  if (auth.status === 'error') {
    return (
      <FullScreen>
        <Alert tone="error" live title={m.common.error.configTitle} className="max-w-xl">
          {auth.error}
        </Alert>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          {m.common.action.retry}
        </Button>
      </FullScreen>
    );
  }
  return (
    <FullScreen>
      <Spinner size={28} label={m.common.error.redirecting} />
      <span>{auth.status === 'loading' ? m.common.state.loading : m.common.error.redirecting}</span>
    </FullScreen>
  );
}
