/** One wrong input of a request (RFC 9457 extension of the API: `errors[]`). */
export interface ProblemFieldError {
  /** JSON Pointer into the request body, fragment form ("#/quantity"). */
  pointer: string | null;
  /** Query or header parameter name. */
  parameter: string | null;
  code: string;
  detail: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string | null;
  code: string;
  traceId: string | null;
  errors: ProblemFieldError[];
}

/** An error answered by the API (problem+json) or a request that never got an answer. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem: Problem | null;
  readonly retryAfterSeconds: number | null;

  constructor(init: {
    status: number;
    code: string;
    message: string;
    problem?: Problem | null;
    retryAfterSeconds?: number | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.problem = init.problem ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }

  get errors(): ProblemFieldError[] {
    return this.problem?.errors ?? [];
  }

  get traceId(): string | null {
    return this.problem?.traceId ?? null;
  }

  /** The request may or may not have been applied: keep the same Idempotency-Key when retrying. */
  get outcomeUnknown(): boolean {
    return this.status === 0 || this.status >= 500 || this.status === 409;
  }
}

export const NETWORK_ERROR = 'NETWORK_ERROR';

export function networkError(cause: unknown): ApiError {
  const error = new ApiError({ status: 0, code: NETWORK_ERROR, message: 'Không kết nối được tới máy chủ.' });
  error.cause = cause;
  return error;
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Reads a problem+json body; anything else becomes a generic problem of that status. */
export async function problemFromResponse(response: Response): Promise<ApiError> {
  const retryAfter = Number(response.headers.get('retry-after'));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const problem = toProblem(body, response.status);
  return new ApiError({
    status: response.status,
    code: problem?.code ?? genericCode(response.status),
    message: problem?.detail ?? problem?.title ?? `Lỗi ${response.status}`,
    problem,
    retryAfterSeconds,
  });
}

function toProblem(body: unknown, status: number): Problem | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const raw = body as Record<string, unknown>;
  const errors = Array.isArray(raw.errors) ? raw.errors.flatMap(toFieldError) : [];
  return {
    type: str(raw.type) ?? 'about:blank',
    title: str(raw.title) ?? '',
    status: typeof raw.status === 'number' ? raw.status : status,
    detail: str(raw.detail),
    code: str(raw.code) ?? genericCode(status),
    traceId: str(raw.traceId),
    errors,
  };
}

function toFieldError(value: unknown): ProblemFieldError[] {
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const raw = value as Record<string, unknown>;
  return [
    {
      pointer: str(raw.pointer),
      parameter: str(raw.parameter),
      code: str(raw.code) ?? 'INVALID_VALUE',
      detail: str(raw.detail) ?? '',
    },
  ];
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

function genericCode(status: number): string {
  switch (status) {
    case 401:
      return 'UNAUTHENTICATED';
    case 403:
      return 'INSUFFICIENT_ROLE';
    case 404:
      return 'NOT_FOUND';
    case 412:
      return 'PRECONDITION_FAILED';
    case 429:
      return 'RATE_LIMITED';
    default:
      return status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED';
  }
}

/** "#/vesting/cliffMonths" → "vesting.cliffMonths"; the first segment is the form field. */
export function pointerPath(pointer: string | null): string | null {
  if (!pointer) {
    return null;
  }
  const path = pointer
    .replace(/^#?\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
    .join('.');
  return path === '' ? null : path;
}

/** Field → message map for the failed inputs of a problem, keyed by pointer path. */
export function fieldErrorsOf(error: ApiError | null): Record<string, string> {
  const result: Record<string, string> = {};
  for (const item of error?.errors ?? []) {
    const key = pointerPath(item.pointer) ?? item.parameter;
    if (key && !(key in result)) {
      result[key] = item.detail;
    }
  }
  return result;
}
