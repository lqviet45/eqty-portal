import { ApiError } from '@/lib/api/errors';
import { checkTitles, errorMessages } from '@/messages/codes';
import { common } from '@/messages/common';
import { capTable } from '@/messages/capTable';
import { companies } from '@/messages/companies';
import { dashboard } from '@/messages/dashboard';
import { preview } from '@/messages/preview';
import { stakeholders } from '@/messages/stakeholders';
import { transactions } from '@/messages/transactions';
import { equity } from '@/messages/equity';
import { ledger } from '@/messages/ledger';
import { grants } from '@/messages/grants';
import { portfolio } from '@/messages/portfolio';
import { members } from '@/messages/members';
import { settings } from '@/messages/settings';
import { importMessages } from '@/messages/import';
import { invite } from '@/messages/invite';
import { employee } from '@/messages/employee';
import { enums } from '@/messages/enums';

// Vietnamese is the only locale today. Components read text through useMessages() so adding English means
// a second catalog with the same shape, not edits across screens.
export const vi = {
  common,
  enums,
  employee,
  companies,
  dashboard,
  capTable,
  preview,
  stakeholders,
  transactions,
  equity,
  ledger,
  grants,
  portfolio,
  members,
  settings,
  invite,
  import: importMessages,
};
export type Messages = typeof vi;

export function useMessages(): Messages {
  return vi;
}

export interface ErrorText {
  /** What happened, in Vietnamese. */
  message: string;
  /** The server's own wording (English, with the exact numbers), shown smaller when it adds something. */
  detail: string | null;
  traceId: string | null;
}

/** Rewords an API error for people: our sentence for the code, the server's detail kept as secondary text. */
export function describeError(error: unknown): ErrorText {
  if (!(error instanceof ApiError)) {
    return {
      message: 'Đã xảy ra lỗi không mong đợi.',
      detail: error instanceof Error ? error.message : null,
      traceId: null,
    };
  }
  const known = errorMessages[error.code];
  if (known) {
    const detail = error.status === 0 || error.message === known ? null : error.message;
    return {
      message: known,
      detail: error.code === 'RATE_LIMITED' ? retryHint(error) : detail,
      traceId: error.traceId,
    };
  }
  const title = checkTitles[error.code];
  return {
    message: title ?? error.message,
    detail: title && error.message !== title ? error.message : null,
    traceId: error.traceId,
  };
}

function retryHint(error: ApiError): string | null {
  return error.retryAfterSeconds ? `Thử lại sau ${error.retryAfterSeconds} giây.` : null;
}

/** Vietnamese text for a bare API code (e.g. the failure code stored on an import). */
export function describeCode(code: string): string {
  return errorMessages[code] ?? checkTitles[code] ?? code;
}
