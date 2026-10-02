'use client';

import { Badge, type Tone } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { CheckStatus, PreviewCheck } from '@/lib/api/types';
import { useMessages } from '@/lib/i18n';
import { checkTitles } from '@/messages/codes';
import { label } from '@/messages/enums';

const TONE: Record<CheckStatus, Tone> = { PASSED: 'success', FAILED: 'danger', INFO: 'neutral' };

/**
 * The "Kiểm tra trước khi ghi" list. Titles are ours (by code); the line under each is the server's own
 * wording, which carries the exact figures. Nothing here decides anything: the server already did.
 */
export function PreviewChecks({
  checks,
  checking = false,
  title,
  note,
  bare = false,
}: {
  checks: readonly PreviewCheck[] | null | undefined;
  checking?: boolean;
  title?: string;
  note?: string;
  /** Without the card chrome: used inside a form panel. */
  bare?: boolean;
}) {
  const m = useMessages();
  const list = (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <h2
          className={bare ? 'text-xs font-semibold tracking-wider text-slate-600 uppercase' : 'text-[17px] font-bold'}
        >
          {title ?? m.preview.title}
        </h2>
        <span className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
          {checking && <Spinner size={14} />}
          {checking ? m.preview.checking : (note ?? m.preview.noWrite)}
        </span>
      </div>
      {checks && checks.length > 0 ? (
        <ul aria-busy={checking} className={checking ? 'opacity-60' : undefined}>
          {checks.map((check, index) => (
            <li
              key={`${check.code}-${index}`}
              className="grid grid-cols-[84px_minmax(0,1fr)] items-start gap-2.5 border-b border-slate-100 py-2.5 last:border-b-0"
            >
              <Badge tone={TONE[check.status]} className="justify-center">
                {label(m.enums.checkStatus, check.status)}
              </Badge>
              <div className="min-w-0">
                {/* The code is for support, not for the reader: it stays a tooltip. */}
                <div className="text-sm font-medium" title={check.code}>
                  {checkTitles[check.code] ?? check.code}
                </div>
                {check.detail && <div className="text-[13px] text-slate-600">{check.detail}</div>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-3 text-sm text-slate-500">{checking ? m.preview.checking : m.preview.empty}</p>
      )}
    </>
  );
  return bare ? (
    <div className="flex flex-col gap-1">{list}</div>
  ) : (
    <section className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-5 py-4">{list}</section>
  );
}

/**
 * Says why the write button is off, from what the server's preview already reported. It never decides:
 * the button follows `canSubmit`; this only names the failed checks.
 */
export function SubmitStatus({
  checks,
  checking,
  canSubmit,
  localErrors,
}: {
  checks: readonly PreviewCheck[] | null | undefined;
  checking: boolean;
  canSubmit: boolean;
  localErrors: boolean;
}) {
  const m = useMessages();
  if (checking || (canSubmit && !localErrors)) {
    return null;
  }
  const failed = checks?.filter((check) => check.status === 'FAILED') ?? [];
  const text = localErrors
    ? m.preview.blockedLocal
    : failed.length > 0
      ? m.preview.blockedChecks(failed.length)
      : m.preview.blockedEmpty;
  return (
    <div className="flex flex-col gap-0.5 text-[13px] text-slate-600 sm:col-span-2" role="status">
      <span>{text}</span>
      {!localErrors && failed.length > 0 && (
        <ul className="list-disc pl-5">
          {failed.map((check, index) => (
            <li key={`${check.code}-${index}`}>{checkTitles[check.code] ?? check.code}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
