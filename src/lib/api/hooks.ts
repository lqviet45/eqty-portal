'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { api, type ApiResponse, type QueryValue } from './client';
import { ApiError, fieldErrorsOf, isApiError } from './errors';
import { IdempotencyKeys } from './idempotency';

/** "13" or W/"13" → 13: the ledger version a response describes. */
export function ledgerVersionOf(etag: string | null): number | null {
  if (!etag) {
    return null;
  }
  const match = /^(?:W\/)?"?(\d+)"?$/.exec(etag.trim());
  return match?.[1] ? Number(match[1]) : null;
}

function asApiError(error: unknown): ApiError | null {
  if (error === null || error === undefined) {
    return null;
  }
  return isApiError(error) ? error : new ApiError({ status: 0, code: 'REQUEST_FAILED', message: error instanceof Error ? error.message : String(error) });
}

/** Query keys of everything that depends on one company's ledger start with this prefix. */
export const companyKey = (companyId: string) => ['c', companyId] as const;

export interface ApiQueryOptions<T = unknown> {
  query?: Record<string, QueryValue>;
  enabled?: boolean;
  /** Poll while something runs in the background (Excel import). */
  refetchInterval?: number | false | ((data: T | undefined) => number | false);
  /** Keep showing the previous result while a new filter loads. */
  keepPrevious?: boolean;
}

export function useApiQuery<T>(key: readonly unknown[], path: string, options: ApiQueryOptions<T> = {}) {
  const query = useQuery({
    queryKey: [...key, options.query ?? null],
    queryFn: ({ signal }) => api.get<T>(path, { query: options.query, signal }),
    enabled: options.enabled ?? true,
    refetchInterval: typeof options.refetchInterval === 'function' ? (q) => (options.refetchInterval as (data: T | undefined) => number | false)(q.state.data?.data) : options.refetchInterval,
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
  });
  return {
    data: query.data?.data,
    etag: query.data?.etag ?? null,
    /** Version of the ledger this screen was computed from (from the ETag); send it back as If-Match when saving. */
    ledgerVersion: ledgerVersionOf(query.data?.etag ?? null),
    error: asApiError(query.error),
    isPending: query.isPending,
    isFetching: query.isFetching,
    isPlaceholderData: query.isPlaceholderData,
    refetch: query.refetch,
  };
}

export type ApiQuery<T> = ReturnType<typeof useApiQuery<T>>;

/** JSON.stringify(FormData) is "{}": fingerprint uploads by file identity so a different file never reuses a key. */
function fingerprintBody(body: unknown): unknown {
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return Array.from(body.entries(), ([key, value]) => [key, value instanceof File ? `${value.name}:${value.size}:${value.lastModified}` : value]);
  }
  return body;
}

export interface WriteOptions {
  /** Ledger version the user decided on. */
  ifMatch?: number | null;
  /** Skip Idempotency-Key (only for calls that are not writes). */
  idempotent?: boolean;
  /** Skip refreshing the company's screens after success. */
  keepCache?: boolean;
}

/**
 * Runs write requests (POST with Idempotency-Key). `run` resolves with the response, or null after setting
 * `error`: callers branch on the result and render `error` / `fieldErrors`; nothing throws into the UI.
 */
export function useWrite(companyId: string | null) {
  const client = useQueryClient();
  const keys = useRef(new IdempotencyKeys());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const run = useCallback(
    async <TResult = unknown>(path: string, body: unknown, options: WriteOptions = {}): Promise<ApiResponse<TResult> | null> => {
      setPending(true);
      setError(null);
      const idempotencyKey = options.idempotent === false ? undefined : keys.current.next({ path, body: fingerprintBody(body) });
      try {
        const response = await api.post<TResult>(path, body, { ifMatch: options.ifMatch, idempotencyKey });
        keys.current.settle();
        if (companyId && !options.keepCache) {
          await client.invalidateQueries({ queryKey: companyKey(companyId) });
        }
        return response;
      } catch (cause) {
        const apiError = asApiError(cause);
        if (apiError && !apiError.outcomeUnknown) {
          keys.current.settle();
        }
        setError(apiError);
        return null;
      } finally {
        setPending(false);
      }
    },
    [client, companyId],
  );

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, fieldErrors: fieldErrorsOf(error), reset };
}

interface PreviewResult {
  canSubmit: boolean;
  ledgerVersion: number;
}

/**
 * "Check before saving": posts the form to a `:preview` endpoint a moment after the last keystroke. The server
 * answers 200 even for an incomplete form, so failures arrive as data (checks), not errors.
 * `canSubmit` is true only when the answer is for exactly what is on screen now.
 */
export function usePreview<TRequest, TResponse extends PreviewResult>(companyId: string, path: string, body: TRequest | null, enabled = true) {
  const debounced = useDebouncedValue(body, 300);
  const inSync = JSON.stringify(debounced) === JSON.stringify(body);

  const query = useQuery({
    queryKey: [...companyKey(companyId), 'preview', path, debounced],
    queryFn: ({ signal }) => api.post<TResponse>(path, debounced, { signal }),
    enabled: enabled && debounced !== null,
    placeholderData: keepPreviousData,
    gcTime: 30_000,
  });

  const data = query.data?.data ?? null;
  const upToDate = enabled && inSync && !query.isFetching && !query.isPlaceholderData && data !== null;
  return {
    preview: data,
    isChecking: enabled && (!inSync || query.isFetching),
    upToDate,
    canSubmit: upToDate && data.canSubmit,
    /** The ledger version the check ran against: send it as If-Match when saving. */
    ledgerVersion: data?.ledgerVersion ?? null,
    error: asApiError(query.error),
  };
}
