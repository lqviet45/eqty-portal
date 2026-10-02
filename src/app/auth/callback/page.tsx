'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FullScreen } from '@/components/layout/RequireAuth';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { completeLogin, startLogin } from '@/lib/auth/session';
import { useMessages } from '@/lib/i18n';
import { safeReturnTo } from '@/lib/routes';

export default function AuthCallbackPage() {
  const m = useMessages();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    completeLogin().then(
      (user) => router.replace(safeReturnTo((user.state as { returnTo?: unknown } | undefined)?.returnTo)),
      (cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)),
    );
  }, [router]);

  if (error) {
    return (
      <FullScreen>
        <Alert tone="error" live title={m.common.error.authTitle} className="max-w-xl">
          {error}
        </Alert>
        <Button onClick={() => void startLogin({ returnTo: '/' })}>{m.common.action.retry}</Button>
      </FullScreen>
    );
  }
  return (
    <FullScreen>
      <Spinner size={28} label={m.common.state.loading} />
      <span>{m.common.state.loading}</span>
    </FullScreen>
  );
}
