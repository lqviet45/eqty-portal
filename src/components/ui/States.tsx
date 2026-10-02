'use client';

import type { ReactNode } from 'react';
import type { ApiError } from '@/lib/api/errors';
import type { ApiQuery } from '@/lib/api/hooks';
import { describeError, useMessages } from '@/lib/i18n';
import { Alert } from './Alert';
import { Button } from './Button';
import { Spinner } from './Spinner';

export function LoadingState({ label }: { label?: string }) {
  const m = useMessages();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-600" role="status">
      <Spinner />
      <span>{label ?? m.common.state.loading}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const m = useMessages();
  const text = describeError(error);
  return (
    <Alert
      tone="error"
      live
      title={title ?? m.common.error.title}
      actions={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {m.common.action.retry}
          </Button>
        )
      }
    >
      <p>{text.message}</p>
      {text.detail && <p className="mt-1 text-[13px] opacity-80">{text.detail}</p>}
      {text.traceId && (
        <p className="mt-1 font-mono text-xs opacity-70">
          {m.common.error.traceId}: {text.traceId}
        </p>
      )}
    </Alert>
  );
}

/** An empty list: what is missing and, when the viewer can fix it, the one button that does. */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-5 py-10 text-center text-slate-600">
      <p>{children}</p>
      {action}
    </div>
  );
}

/** Renders loading and error states for a query, then its data. */
export function Async<T>({ query, children }: { query: ApiQuery<T>; children: (data: T) => ReactNode }) {
  if (query.isPending) {
    return <LoadingState />;
  }
  if (query.error || query.data === undefined) {
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <>{children(query.data)}</>;
}

/** What a failed write shows above its form: our sentence for the code, plus a reload for stale ledgers. */
export function WriteError({ error, onReload }: { error: ApiError | null; onReload?: () => void }) {
  const m = useMessages();
  if (!error) {
    return null;
  }
  const text = describeError(error);
  const stale = error.status === 412 || error.code === 'PRECONDITION_FAILED';
  return (
    <Alert
      tone="error"
      live
      title={stale ? m.common.error.stale : undefined}
      actions={
        stale && onReload ? (
          <Button variant="secondary" onClick={onReload}>
            {m.common.action.reload}
          </Button>
        ) : undefined
      }
    >
      <p>{text.message}</p>
      {text.detail && <p className="mt-1 text-[13px] opacity-80">{text.detail}</p>}
      {text.traceId && (
        <p className="mt-1 font-mono text-xs opacity-70">
          {m.common.error.traceId}: {text.traceId}
        </p>
      )}
    </Alert>
  );
}
