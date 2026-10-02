'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Layout';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, useWrite } from '@/lib/api/hooks';
import type { Portfolio, PortfolioGrant } from '@/lib/api/types';
import { RoleGate, useCompany } from '@/lib/company';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format/date';
import { formatInt, formatMoney, formatSignedInt } from '@/lib/format/number';
import { useMessages } from '@/lib/i18n';
import { frequencyLabel, label } from '@/messages/enums';

const INITIAL_TIMELINE = 7;

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('flex flex-col gap-2.5 rounded-[14px] border border-slate-200 bg-white p-[18px]', className)}>{children}</section>;
}

function GrantCard({ grant, own, schedule }: { grant: PortfolioGrant; own: boolean; schedule: boolean }) {
  const m = useMessages();
  const t = m.portfolio;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded || schedule ? grant.timeline : grant.timeline.slice(0, INITIAL_TIMELINE);
  const id = t.grantShort(grant.id);

  async function accept() {
    if (await write.run(`/api/v1/companies/${companyId}/grants/${grant.id}:accept`, {})) {
      toast.success(t.accepted);
    }
  }

  const rows: [string, string][] = [
    [t.type, label(m.enums.awardType, grant.awardType)],
    [t.quantity, formatInt(grant.quantity)],
    ...(grant.strikePrice ? ([[t.strike, formatMoney(grant.strikePrice)]] as [string, string][]) : []),
    [t.start, formatDate(grant.vesting.startDate)],
    [t.cliffDuration, t.cliffDurationValue(grant.vesting.cliffMonths, grant.vesting.durationMonths)],
    [t.frequency, frequencyLabel(grant.vesting.frequencyMonths)],
    ...(grant.exerciseWindowDays !== null ? ([[t.ifLeave, t.exerciseDays(grant.exerciseWindowDays)]] as [string, string][]) : []),
    ...(grant.terminationDate ? ([[t.terminatedOn, formatDate(grant.terminationDate)]] as [string, string][]) : []),
    ...(grant.exerciseDeadlineDate ? ([[t.exerciseDeadline, formatDate(grant.exerciseDeadlineDate)]] as [string, string][]) : []),
    [t.status, label(m.enums.grantStatus, grant.status)],
    ...(grant.intrinsicValue ? ([[t.grantValue, formatMoney(grant.intrinsicValue)]] as [string, string][]) : []),
  ];

  return (
    <>
      {!grant.accepted && grant.status === 'ACTIVE' && (
        <section className="flex flex-col gap-2.5 rounded-[14px] border border-amber-200 bg-amber-50 px-[18px] py-4">
          <div className="text-sm text-amber-950">{t.unaccepted(id)}</div>
          <WriteError error={write.error} />
          {own && <Button onClick={() => void accept()} loading={write.pending}>{t.accept}</Button>}
        </section>
      )}
      {!schedule && (
        <Section>
          <div className="font-bold">{t.termsTitle(id)}</div>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-[13.5px]">
            {rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-slate-600">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
      <Section className="gap-1">
        <div className="mb-2 font-bold">{t.timelineTitle} · {id}</div>
        <ul>
          {shown.map((tranche) => (
            <li key={tranche.vestingDate} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0">
              <span
                aria-hidden="true"
                className={cn('block size-3 rounded-full', tranche.state === 'VESTED' ? 'bg-brand' : tranche.state === 'FORFEITED' ? 'bg-slate-300' : 'box-border border-2 border-slate-400')}
              />
              <span className="flex flex-col">
                <span className="font-mono text-[13px]">{formatDate(tranche.vestingDate)}</span>
                <span className="text-xs text-slate-500">{label(m.enums.trancheState, tranche.state)}</span>
              </span>
              <span className="flex flex-col text-right">
                <span className={cn('font-mono text-[13.5px] font-semibold', tranche.state === 'FORFEITED' && 'text-slate-400 line-through')}>{formatSignedInt(tranche.quantity)}</span>
                <span className="font-mono text-xs text-slate-500">{formatInt(tranche.cumulativeQuantity)}</span>
              </span>
            </li>
          ))}
        </ul>
        {!schedule && grant.timeline.length > INITIAL_TIMELINE && (
          <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-2 self-start text-[13.5px] font-semibold text-brand">
            {expanded ? t.showLess : t.showAll(grant.timeline.length)}
          </button>
        )}
      </Section>
    </>
  );
}

function PortfolioView({ data, own }: { data: Portfolio; own: boolean }) {
  const m = useMessages();
  const t = m.portfolio;
  const schedule = useSearchParams().get('v') === 'schedule';
  const { totals } = data;
  const value = data.estimatedValue;
  // Bar width only: the percent text shown is the server's string.
  const vestedBar = Math.min(100, Number(totals.vestedPercent));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3.5">
      {!own && <Alert tone="info">{t.viewingNote}</Alert>}
      {!schedule && (
        <>
          <section className="flex flex-col gap-3.5 rounded-2xl bg-slate-900 p-5 text-slate-50">
            <div className="flex flex-col gap-0.5">
              <div className="text-[13px] text-slate-300">{t.vestedAt(formatDate(data.asOfDate))}</div>
              <div className="font-mono text-[34px] leading-tight font-bold tracking-tight">
                {formatInt(totals.vestedQuantity)} <span className="text-base font-normal text-slate-400">/ {formatInt(totals.grantedQuantity)}</span>
              </div>
            </div>
            <div role="progressbar" aria-valuenow={Math.round(vestedBar)} aria-valuemin={0} aria-valuemax={100} aria-label={t.vestedAt(formatDate(data.asOfDate))} className="h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-teal-400" style={{ width: `${vestedBar}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-400">{t.unvested}</div>
                <div className="font-mono font-semibold">{formatInt(totals.unvestedQuantity)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400">{data.nextTranche ? t.nextTranche(formatDate(data.nextTranche.vestingDate)) : t.nextTranche('—')}</div>
                <div className="font-mono font-semibold text-teal-300">{data.nextTranche ? formatSignedInt(data.nextTranche.quantity) : '—'}</div>
              </div>
            </div>
            {totals.forfeitedQuantity > 0 && <div className="text-[13px] text-slate-400">{t.forfeited}: {formatInt(totals.forfeitedQuantity)}</div>}
          </section>

          <Section>
            <div className="text-[13px] text-slate-600">{t.valueTitle}</div>
            {value ? (
              <>
                <div className="font-mono text-2xl font-bold">{formatMoney(value.vestedAwardsIntrinsicValue)}</div>
                {data.shares.length > 0 && (
                  <div className="text-[13px] text-slate-600">{t.sharesValue}: <strong className="font-mono">{formatMoney(value.sharesValue)}</strong></div>
                )}
                <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                  {t.disclaimer(formatMoney(value.pricePerShare.pricePerShare), formatDate(value.pricePerShare.effectiveDate), label(m.enums.priceSource, value.pricePerShare.source))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">{t.valueNone}</p>
            )}
          </Section>

          {data.shares.length > 0 && (
            <Section>
              <div className="font-bold">{t.sharesTitle}</div>
              <ul className="text-[13.5px]">
                {data.shares.map((share) => (
                  <li key={share.shareClassId} className="flex justify-between border-b border-slate-100 py-1.5 last:border-b-0">
                    <span className="text-slate-600">{share.shareClassName}</span>
                    <span className="font-mono font-semibold">{formatInt(share.quantity)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {data.grants.length === 0 ? <Section><p className="text-slate-600">{t.noGrants}</p></Section> : data.grants.map((grant) => <GrantCard key={grant.id} grant={grant} own={own} schedule={schedule} />)}
      <Badge tone="neutral" className="self-center">{label(m.enums.employment, data.stakeholder.employment.status)}</Badge>
    </div>
  );
}

export function PortfolioPage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const stakeholderId = useSearchParams().get('s');
  const own = company.role === 'EMPLOYEE' || !stakeholderId;
  const path = own ? `/bff/v1/companies/${companyId}/me/portfolio` : `/bff/v1/companies/${companyId}/stakeholders/${stakeholderId}/portfolio`;
  const query = useApiQuery<Portfolio>(['c', companyId, 'portfolio', own ? 'me' : stakeholderId], path);

  return (
    <RoleGate route="portfolio">
      {company.role !== 'EMPLOYEE' && <PageHeader title={query.data ? m.portfolio.viewingFor(query.data.stakeholder.displayName) : m.portfolio.overallTitle} subtitle={company.name} />}
      <Async query={query}>{(data) => <PortfolioView data={data} own={own} />}</Async>
    </RoleGate>
  );
}
