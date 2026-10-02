'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Layout';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, useWrite } from '@/lib/api/hooks';
import type { Portfolio, PortfolioGrant } from '@/lib/api/types';
import { RoleGate, useCompany } from '@/lib/company';
import { cn } from '@/lib/cn';
import { formatDate, monthsBetween } from '@/lib/format/date';
import { formatInt, formatMoney, formatSignedInt } from '@/lib/format/number';
import { useMessages } from '@/lib/i18n';
import { frequencyLabel, label } from '@/messages/enums';

const INITIAL_TIMELINE = 7;

function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        'flex scroll-mt-6 flex-col gap-2.5 rounded-[14px] border border-slate-200 bg-white p-[18px] lg:rounded-xl lg:p-6',
        className,
      )}
    >
      {children}
    </section>
  );
}

function TrancheDot({ state }: { state: PortfolioGrant['timeline'][number]['state'] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'block size-3 rounded-full',
        state === 'VESTED'
          ? 'bg-brand'
          : state === 'FORFEITED'
            ? 'bg-slate-300'
            : 'box-border border-2 border-slate-400',
      )}
    />
  );
}

/** The "Mốc" column: months since the vesting start, from the plan's own dates (text only, no arithmetic on quantities). */
function milestoneOf(grant: PortfolioGrant, index: number, t: ReturnType<typeof useMessages>['portfolio']): string {
  const tranche = grant.timeline[index];
  const months = tranche ? monthsBetween(grant.vesting.startDate, tranche.vestingDate) : null;
  if (index === grant.timeline.length - 1) return t.milestoneDone;
  if (months === null) return '';
  return index === 0 && grant.vesting.cliffMonths > 0 ? t.milestoneCliff(months) : t.milestoneMonth(months);
}

function Timeline({ grant, schedule, id }: { grant: PortfolioGrant; schedule: boolean; id?: string }) {
  const m = useMessages();
  const t = m.portfolio;
  const [expanded, setExpanded] = useState(false);
  const all = expanded || schedule;
  const shown = all ? grant.timeline : grant.timeline.slice(0, INITIAL_TIMELINE);
  const more = grant.timeline.length > INITIAL_TIMELINE;
  const showAll = more && (
    <button type="button" onClick={() => setExpanded((v) => !v)} className="text-brand text-[13.5px] font-semibold">
      {expanded ? t.showLess : t.showAll(grant.timeline.length)}
    </button>
  );

  return (
    <>
      {/* Phones: a list. */}
      <Section id={id} className="gap-1 lg:hidden">
        <div className="mb-2 font-bold">
          {t.timelineTitle} · {t.grantShort(grant.id)}
        </div>
        <ul>
          {shown.map((tranche) => (
            <li
              key={tranche.vestingDate}
              className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0"
            >
              <TrancheDot state={tranche.state} />
              <span className="flex flex-col">
                <span className="font-mono text-[13px]">{formatDate(tranche.vestingDate)}</span>
                <span className="text-xs text-slate-500">{label(m.enums.trancheState, tranche.state)}</span>
              </span>
              <span className="flex flex-col text-right">
                <span
                  className={cn(
                    'font-mono text-[13.5px] font-semibold',
                    tranche.state === 'FORFEITED' && 'text-slate-400 line-through',
                  )}
                >
                  {formatSignedInt(tranche.quantity)}
                </span>
                <span className="font-mono text-xs text-slate-500">{formatInt(tranche.cumulativeQuantity)}</span>
              </span>
            </li>
          ))}
        </ul>
        {!schedule && showAll && <div className="mt-2">{showAll}</div>}
      </Section>

      {/* Desktop (design "Cổng nhân viên (web)"): a table. */}
      <section
        id={id}
        className="hidden scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white lg:block"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3.5">
          <div className="text-base font-bold">
            {t.timelineTitle} · {t.grantShort(grant.id)}
          </div>
          {showAll}
        </div>
        <div className="overflow-x-auto">
          <table className="eqty-table">
            <thead>
              <tr>
                <th className="w-7" />
                <th>{t.colDate}</th>
                <th>{t.colMilestone}</th>
                <th className="text-right">{t.colAdd}</th>
                <th className="text-right">{t.colTotal}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((tranche, index) => (
                <tr key={tranche.vestingDate}>
                  <td>
                    <TrancheDot state={tranche.state} />
                  </td>
                  <td className="font-mono text-[13.5px] whitespace-nowrap">{formatDate(tranche.vestingDate)}</td>
                  <td className="whitespace-nowrap text-slate-600">{milestoneOf(grant, index, t)}</td>
                  <td
                    className={cn('num font-semibold', tranche.state === 'FORFEITED' && 'text-slate-400 line-through')}
                  >
                    {formatSignedInt(tranche.quantity)}
                  </td>
                  <td className="num text-slate-600">{formatInt(tranche.cumulativeQuantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Terms({ grant, schedule, id }: { grant: PortfolioGrant; schedule: boolean; id?: string }) {
  const m = useMessages();
  const t = m.portfolio;
  const rows: [string, string][] = [
    [t.type, label(m.enums.awardType, grant.awardType)],
    [t.quantity, formatInt(grant.quantity)],
    ...(grant.strikePrice ? ([[t.strike, formatMoney(grant.strikePrice)]] as [string, string][]) : []),
    [t.start, formatDate(grant.vesting.startDate)],
    [t.cliffDuration, t.cliffDurationValue(grant.vesting.cliffMonths, grant.vesting.durationMonths)],
    [t.frequency, frequencyLabel(grant.vesting.frequencyMonths)],
    ...(grant.exerciseWindowDays !== null
      ? ([[t.ifLeave, t.exerciseDays(grant.exerciseWindowDays)]] as [string, string][])
      : []),
    ...(grant.terminationDate ? ([[t.terminatedOn, formatDate(grant.terminationDate)]] as [string, string][]) : []),
    ...(grant.exerciseDeadlineDate
      ? ([[t.exerciseDeadline, formatDate(grant.exerciseDeadlineDate)]] as [string, string][])
      : []),
    [t.status, label(m.enums.grantStatus, grant.status)],
    ...(grant.intrinsicValue ? ([[t.grantValue, formatMoney(grant.intrinsicValue)]] as [string, string][]) : []),
  ];
  return (
    <Section id={id} className={cn(schedule && 'max-lg:hidden', 'lg:gap-3')}>
      <div className="font-bold lg:text-base">{t.termsTitle(t.grantShort(grant.id))}</div>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 text-[13.5px] lg:gap-x-4 lg:gap-y-2.5 lg:text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-slate-600">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function AcceptBanner({ grant, own }: { grant: PortfolioGrant; own: boolean }) {
  const t = useMessages().portfolio;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);

  async function accept() {
    if (await write.run(`/api/v1/companies/${companyId}/grants/${grant.id}:accept`, {})) {
      toast.success(t.accepted);
    }
  }

  return (
    <section className="order-3 flex flex-col gap-2.5 rounded-[14px] border border-amber-200 bg-amber-50 px-[18px] py-4 lg:order-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-3 lg:rounded-xl lg:px-5">
      <div className="text-sm text-amber-950 lg:text-[14.5px]">{t.unaccepted(t.grantShort(grant.id))}</div>
      <WriteError error={write.error} />
      {own && (
        <Button onClick={() => void accept()} loading={write.pending}>
          {t.accept}
        </Button>
      )}
    </section>
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
  const pending = data.grants.filter((g) => !g.accepted && g.status === 'ACTIVE');

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3.5 lg:max-w-none lg:gap-5">
      {!own && (
        <Alert tone="info" className="order-1">
          {t.viewingNote}
        </Alert>
      )}
      {pending.map((grant) => (
        <AcceptBanner key={grant.id} grant={grant} own={own} />
      ))}

      <div
        className={cn(
          'grid gap-3.5 lg:grid-cols-[repeat(auto-fit,minmax(360px,1fr))] lg:gap-4',
          schedule && 'max-lg:hidden',
        )}
      >
        <section className="flex flex-col gap-3.5 rounded-2xl bg-slate-900 p-5 text-slate-50 lg:gap-4 lg:rounded-xl lg:p-6">
          <div className="flex flex-col gap-0.5">
            <div className="text-[13px] text-slate-300 lg:text-[13.5px]">{t.vestedAt(formatDate(data.asOfDate))}</div>
            <div className="font-mono text-[34px] leading-tight font-bold tracking-tight lg:text-[40px]">
              {formatInt(totals.vestedQuantity)}{' '}
              <span className="text-base font-normal text-slate-400 lg:text-lg">
                / {formatInt(totals.grantedQuantity)}
              </span>
            </div>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(vestedBar)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t.vestedAt(formatDate(data.asOfDate))}
            className="h-2.5 overflow-hidden rounded-full bg-slate-800"
          >
            <div className="h-full bg-teal-400" style={{ width: `${vestedBar}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-slate-400 lg:text-[12.5px]">{t.unvested}</div>
              <div className="font-mono font-semibold lg:text-[17px]">{formatInt(totals.unvestedQuantity)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 lg:text-[12.5px]">
                {data.nextTranche ? t.nextTranche(formatDate(data.nextTranche.vestingDate)) : t.nextTranche('—')}
              </div>
              <div className="font-mono font-semibold text-teal-300 lg:text-[17px]">
                {data.nextTranche ? formatSignedInt(data.nextTranche.quantity) : '—'}
              </div>
            </div>
          </div>
          {totals.forfeitedQuantity > 0 && (
            <div className="text-[13px] text-slate-400">
              {t.forfeited}: {formatInt(totals.forfeitedQuantity)}
            </div>
          )}
        </section>

        <Section className="lg:gap-2">
          <div className="text-[13px] text-slate-600 lg:text-[13.5px]">{t.valueTitle}</div>
          {value ? (
            <>
              <div className="font-mono text-2xl font-bold lg:text-[32px]">
                {formatMoney(value.vestedAwardsIntrinsicValue)}
              </div>
              {data.shares.length > 0 && (
                <div className="text-[13px] text-slate-600">
                  {t.sharesValue}: <strong className="font-mono">{formatMoney(value.sharesValue)}</strong>
                </div>
              )}
              <div className="mt-auto border-t border-slate-100 pt-2.5 text-xs text-slate-500 lg:text-[12.5px]">
                {t.disclaimer(
                  formatMoney(value.pricePerShare.pricePerShare),
                  formatDate(value.pricePerShare.effectiveDate),
                  label(m.enums.priceSource, value.pricePerShare.source),
                )}
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
                <li
                  key={share.shareClassId}
                  className="flex justify-between border-b border-slate-100 py-1.5 last:border-b-0"
                >
                  <span className="text-slate-600">{share.shareClassName}</span>
                  <span className="font-mono font-semibold">{formatInt(share.quantity)}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {data.grants.length === 0 ? (
        <Section className="order-4">
          <p className="text-slate-600">{t.noGrants}</p>
        </Section>
      ) : (
        data.grants.map((grant, index) => (
          <div
            key={grant.id}
            className="grid gap-3.5 lg:grid-cols-[repeat(auto-fit,minmax(380px,1fr))] lg:items-start lg:gap-4"
          >
            <Terms grant={grant} schedule={schedule} id={index === 0 ? 'dieu-khoan' : undefined} />
            <Timeline grant={grant} schedule={schedule} id={index === 0 ? 'lich' : undefined} />
          </div>
        ))
      )}
    </div>
  );
}

export function PortfolioPage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const stakeholderId = useSearchParams().get('s');
  const own = company.role === 'EMPLOYEE' || !stakeholderId;
  const path = own
    ? `/bff/v1/companies/${companyId}/me/portfolio`
    : `/bff/v1/companies/${companyId}/stakeholders/${stakeholderId}/portfolio`;
  const query = useApiQuery<Portfolio>(['c', companyId, 'portfolio', own ? 'me' : stakeholderId], path);

  return (
    <RoleGate route="portfolio">
      {company.role !== 'EMPLOYEE' && (
        <PageHeader
          title={query.data ? m.portfolio.viewingFor(query.data.stakeholder.displayName) : m.portfolio.overallTitle}
          subtitle={company.name}
        />
      )}
      <Async query={query}>{(data) => <PortfolioView data={data} own={own} />}</Async>
    </RoleGate>
  );
}
