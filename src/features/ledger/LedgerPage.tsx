'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { PreviewChecks } from '@/components/checks/PreviewChecks';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Select, Textarea } from '@/components/ui/Field';
import { Note } from '@/components/ui/Alert';
import { Card, PageHeader, TableWrap } from '@/components/ui/Layout';
import { ErrorState, LoadingState, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api/client';
import { useApiQuery, usePreview, useWrite, companyKey } from '@/lib/api/hooks';
import type { LedgerEntryRow, LedgerScreen, Stakeholders, VoidPreview } from '@/lib/api/types';
import { errorFor, failedFieldErrors } from '@/lib/checks';
import { RoleGate, useCompany } from '@/lib/company';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatInt, formatMoney } from '@/lib/format/number';
import { cn } from '@/lib/cn';
import { useMessages } from '@/lib/i18n';
import { describeEntry, groupOf, type EntryGroup } from '@/lib/ledger/describe';
import { label } from '@/messages/enums';

const TYPE_GROUPS: Record<string, string> = {
  shares: 'SHARES_ISSUED,SHARES_TRANSFERRED,SHARES_REPURCHASED',
  price: 'SHARE_PRICE_RECORDED',
  equity: 'SHARE_CLASS_CREATED,AUTHORIZED_SHARES_CHANGED,EQUITY_POOL_CREATED,EQUITY_POOL_RESIZED',
  grants: 'GRANT_ISSUED,GRANT_ACCEPTED,EMPLOYMENT_TERMINATED,GRANT_TERMINATED,GRANT_CANCELLED',
  void: 'ENTRY_VOIDED',
};

const GROUP_TONE: Record<EntryGroup, Tone> = { shares: 'info', price: 'warning', equity: 'success', void: 'neutral' };
const PAGE_SIZE = 50;

function VoidForm({ entry, onDone }: { entry: LedgerEntryRow; onDone: () => void }) {
  const m = useMessages();
  const t = m.ledger;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [reason, setReason] = useState('');

  const check = usePreview<{ reason: string }, VoidPreview>(
    companyId,
    `/bff/v1/companies/${companyId}/ledger/${entry.id}/void:preview`,
    { reason: reason.trim() },
  );
  const fields = failedFieldErrors(check.preview?.checks);
  const impact = check.preview?.impact;

  async function confirm() {
    if (
      await write.run(
        `/api/v1/companies/${companyId}/ledger-entries/${entry.id}:void`,
        { reason: reason.trim() },
        { ifMatch: check.ledgerVersion },
      )
    ) {
      toast.success(t.voided);
      onDone();
    }
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3.5 border-t border-slate-200 pt-4">
      <WriteError error={write.error} onReload={() => write.reset()} />
      <Field
        label={t.reason}
        error={errorFor('reason', write.fieldErrors) ?? (reason.trim() ? errorFor('reason', fields) : undefined)}
      >
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={3} />
      </Field>
      <PreviewChecks bare checks={check.preview?.checks} checking={check.isChecking} />
      {impact && (
        <p className="text-[13px] text-slate-600">
          {t.impact(
            formatInt(impact.outstandingBefore),
            formatInt(impact.outstandingAfter),
            formatInt(impact.fullyDilutedBefore),
            formatInt(impact.fullyDilutedAfter),
            formatDate(impact.date),
          )}
        </p>
      )}
      <Note>{t.voidNote}</Note>
      <div className="flex flex-wrap gap-2.5">
        <Button variant="danger" onClick={() => void confirm()} loading={write.pending} disabled={!check.canSubmit}>
          {t.confirmVoid}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          {m.common.action.cancel}
        </Button>
      </div>
    </form>
  );
}

function Detail({ entry }: { entry: LedgerEntryRow }) {
  const m = useMessages();
  const t = m.ledger;
  const [voiding, setVoiding] = useState(false);
  const facts: [string, string][] = [
    [t.factType, entry.type],
    [t.factEffective, formatDate(entry.effectiveDate)],
    [t.factRecorded, `${formatDateTime(entry.recordedAt)} ${t.utc7}`],
    [t.factRecordedBy, entry.recordedByName ?? '—'],
    ...entry.parties.map((p): [string, string] => [label(m.enums.partyRole, p.role), p.name]),
  ];
  if (entry.quantity !== null) facts.push([t.factQuantity, formatInt(entry.quantity)]);
  if (entry.price) facts.push([t.factPrice, formatMoney(entry.price)]);
  if (entry.subtype) facts.push([t.factSubtype, entry.subtype]);
  if (entry.note) facts.push([t.factNote, entry.note]);

  return (
    <aside className="flex min-w-[300px] flex-[0_1_400px] flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold tracking-wider text-slate-600 uppercase">
          {t.entry(entry.ledgerVersion)}
        </div>
        <h2 className="text-lg font-bold">{label(m.enums.ledgerType, entry.type)}</h2>
        <div className="text-slate-700">{describeEntry(entry)}</div>
      </div>
      <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {facts.map(([k, v], i) => (
          <div key={`${k}-${i}`} className="contents">
            <dt className="text-slate-600">{k}</dt>
            <dd className="font-mono text-[13px] [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>
      {entry.actions.void ? (
        voiding ? (
          <VoidForm key={entry.id} entry={entry} onDone={() => setVoiding(false)} />
        ) : (
          <>
            <Button variant="dangerOutline" onClick={() => setVoiding(true)}>
              {t.startVoid}
            </Button>
            <div className="text-[12.5px] text-slate-500">{t.voidOnlyAdmin}</div>
          </>
        )
      ) : (
        <Note>
          {entry.voidsVersion !== null
            ? t.cannotVoidVoid
            : entry.voidedByVersion !== null
              ? t.alreadyVoided(entry.voidedByVersion)
              : t.voidOnlyAdmin}
        </Note>
      )}
    </aside>
  );
}

export function LedgerPage() {
  const m = useMessages();
  const t = m.ledger;
  const { companyId, company } = useCompany();
  const [group, setGroup] = useState('');
  const [stakeholderId, setStakeholderId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [includeVoided, setIncludeVoided] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const people = useApiQuery<Stakeholders>(
    ['c', companyId, 'stakeholders-options'],
    `/bff/v1/companies/${companyId}/stakeholders`,
  );
  const filters = {
    type: TYPE_GROUPS[group] ?? '',
    stakeholderId,
    fromDate,
    toDate,
    includeVoided: includeVoided ? 'true' : 'false',
  };

  const query = useInfiniteQuery({
    queryKey: [...companyKey(companyId), 'ledger', filters],
    queryFn: ({ pageParam, signal }) =>
      api.get<LedgerScreen>(`/bff/v1/companies/${companyId}/ledger`, {
        query: { ...filters, pageSize: PAGE_SIZE, pageToken: pageParam },
        signal,
      }),
    initialPageParam: '',
    getNextPageParam: (last) => last.data.nextPageToken ?? undefined,
  });

  const pages = query.data?.pages ?? [];
  const items = pages.flatMap((page) => page.data.items);
  const first = pages[0]?.data;
  const selected = items.find((entry) => entry.id === selectedId) ?? null;
  const dateInvalid = fromDate !== '' && toDate !== '' && fromDate > toDate;

  const groupRow = (entry: LedgerEntryRow) => (
    <Badge tone={GROUP_TONE[groupOf(entry.type)]}>{label(m.enums.ledgerType, entry.type)}</Badge>
  );

  return (
    <RoleGate route="ledger">
      <PageHeader title={t.title} subtitle={first ? t.subtitle(company.name, first.totalCount) : company.name} />

      <div className="grid grid-cols-2 items-center gap-2.5 sm:flex sm:flex-wrap">
        <Select
          aria-label={t.filterType}
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="w-full min-w-0 sm:w-auto sm:min-w-[190px]"
        >
          <option value="">{t.allTypes}</option>
          <option value="shares">{t.groupShares}</option>
          <option value="price">{t.groupPrice}</option>
          <option value="equity">{t.groupEquity}</option>
          <option value="grants">{t.groupGrants}</option>
          <option value="void">{t.groupVoid}</option>
        </Select>
        <Select
          aria-label={t.filterStakeholder}
          value={stakeholderId}
          onChange={(e) => setStakeholderId(e.target.value)}
          className="w-full min-w-0 sm:w-auto sm:min-w-[190px]"
        >
          <option value="">{t.allStakeholders}</option>
          {people.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </Select>
        <label className="col-span-2 flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-slate-600 sm:col-span-1">
          {t.from}
          <input
            type="date"
            aria-label={t.fromLabel}
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-semibold text-slate-900"
          />
          {t.to}
          <input
            type="date"
            aria-label={t.toLabel}
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-semibold text-slate-900"
          />
        </label>
        <Checkbox
          className="col-span-2 sm:col-span-1"
          label={t.includeVoided}
          checked={includeVoided}
          onChange={(e) => setIncludeVoided(e.target.checked)}
        />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[1_1_640px] overflow-hidden">
          {query.isPending ? (
            <LoadingState />
          ) : query.error ? (
            <div className="p-4">
              <ErrorState error={query.error} onRetry={() => void query.refetch()} />
            </div>
          ) : items.length === 0 ? (
            <p className="px-5 py-10 text-center text-slate-600">
              {dateInvalid || first?.totalCount ? m.common.state.noMatch : t.empty}
            </p>
          ) : (
            <>
              <TableWrap>
                <table className="eqty-table eqty-table--stack">
                  <thead>
                    <tr>
                      <th>{t.colVersion}</th>
                      <th>{t.colType}</th>
                      <th>{t.colContent}</th>
                      <th>{t.colEffective}</th>
                      <th>{t.colRecorded}</th>
                      <th>{t.colRecordedBy}</th>
                      <th>{t.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((entry) => (
                      <tr key={entry.id} className={cn(entry.id === selectedId && 'bg-teal-50')}>
                        <td data-label={t.colVersion}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(entry.id)}
                            aria-label={t.viewEntry(entry.ledgerVersion)}
                            className="text-brand min-h-11 min-w-11 font-mono font-semibold"
                          >
                            {entry.ledgerVersion}
                          </button>
                        </td>
                        <td data-label={t.colType} className="whitespace-nowrap">
                          {groupRow(entry)}
                        </td>
                        <td className={cn('stack-title', entry.voided && 'text-slate-500 line-through')}>
                          {describeEntry(entry)}
                          {entry.note && <div className="text-[12.5px] text-slate-500 no-underline">{entry.note}</div>}
                        </td>
                        <td data-label={t.colEffective} className="font-mono text-[13px] whitespace-nowrap">
                          {formatDate(entry.effectiveDate)}
                        </td>
                        <td data-label={t.colRecorded} className="text-[13px] whitespace-nowrap text-slate-600">
                          {formatDateTime(entry.recordedAt)}
                        </td>
                        <td data-label={t.colRecordedBy} className="whitespace-nowrap text-slate-600">
                          {entry.recordedByName ?? '—'}
                        </td>
                        <td data-label={t.colStatus} className="whitespace-nowrap">
                          {entry.voidedByVersion !== null ? (
                            <Badge tone="danger">{t.voidedBy(entry.voidedByVersion)}</Badge>
                          ) : entry.voidsVersion !== null ? (
                            <Badge tone="neutral">{t.voidsEntry(entry.voidsVersion)}</Badge>
                          ) : (
                            <Badge tone="success">{t.active}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-[13px] text-slate-600">
                <span>{t.showing(items.length, first?.matchedCount ?? items.length)}</span>
                {query.hasNextPage && (
                  <Button
                    variant="secondary"
                    onClick={() => void query.fetchNextPage()}
                    loading={query.isFetchingNextPage}
                  >
                    {m.common.action.loadMore}
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
        {selected && <Detail key={selected.id} entry={selected} />}
      </div>
    </RoleGate>
  );
}
