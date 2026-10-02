import { getAccessToken, handleUnauthorized } from '@/lib/auth/session';
import { loadConfig } from '@/lib/config';
import { ApiError, networkError, problemFromResponse } from './errors';

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Ledger version the user decided on; sent as If-Match: "<version>". */
  ifMatch?: number | null;
  idempotencyKey?: string;
  /** Public endpoints (invitation preview) are called without a token. */
  anonymous?: boolean;
}

export interface ApiResponse<T> {
  data: T;
  /** Raw ETag header, e.g. "13"; the ledger version for ledger data. */
  etag: string | null;
  status: number;
  location: string | null;
  replayed: boolean;
}

export function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) {
    return '';
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const text = params.toString();
  return text === '' ? '' : `?${text}`;
}

export function quoteEtag(version: number): string {
  return `"${version}"`;
}

async function send(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions,
  retried = false,
): Promise<Response> {
  const { apiBaseUrl } = await loadConfig();
  const headers = new Headers({ accept: 'application/json, application/problem+json' });

  if (!options.anonymous) {
    const token = await getAccessToken();
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }
  if (options.idempotencyKey) {
    headers.set('idempotency-key', options.idempotencyKey);
  }
  if (options.ifMatch !== undefined && options.ifMatch !== null) {
    headers.set('if-match', quoteEtag(options.ifMatch));
  }

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // the browser sets the multipart boundary
  } else if (body !== undefined) {
    headers.set('content-type', 'application/json');
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}${buildQuery(options.query)}`, {
      method,
      headers,
      body: payload,
      signal: options.signal,
      cache: 'no-store',
    });
  } catch (cause) {
    if (options.signal?.aborted) {
      throw cause;
    }
    throw networkError(cause);
  }

  if (response.status === 401 && !options.anonymous && !retried) {
    // The token may have expired between the check and the request: renew once, else sign in again.
    if (await handleUnauthorized()) {
      return send(method, path, body, options, true);
    }
  }
  return response;
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  return (text === '' ? undefined : JSON.parse(text)) as T;
}

export async function request<T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const response = await send(method, path, body, options);
  if (!response.ok) {
    throw await problemFromResponse(response);
  }
  return {
    data: await readJson<T>(response),
    etag: response.headers.get('etag'),
    status: response.status,
    location: response.headers.get('location'),
    replayed: response.headers.get('idempotent-replayed') === 'true',
  };
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
};

export interface Download {
  blob: Blob;
  fileName: string;
  etag: string | null;
}

/** Files need the bearer token too, so they cannot be plain links. */
export async function download(path: string, options: RequestOptions = {}): Promise<Download> {
  const response = await send('GET', path, undefined, options);
  if (!response.ok) {
    throw await problemFromResponse(response);
  }
  return {
    blob: await response.blob(),
    fileName: fileNameOf(response.headers.get('content-disposition')) ?? 'download',
    etag: response.headers.get('etag'),
  };
}

export function fileNameOf(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // fall through to the plain form
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(contentDisposition);
  return plain?.[1]?.trim() ?? null;
}

/** Saves a downloaded file through a temporary link. */
export function saveBlob({ blob, fileName }: Download): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export { ApiError };
