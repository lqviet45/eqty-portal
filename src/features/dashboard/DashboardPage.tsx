'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { AsOfDateField } from '@/components/ui/DateField';
import { Kpi, PageHeader, Panel, ProgressBar, TableWrap } from '@/components/ui/Layout';
import { Async } from '@/components/ui/States';
import { useApiQuery } from '@/lib/api/hooks';
import type { Dashboard, OwnershipSlice } from '@/lib/api/types';
import { RoleGate, useCompany } from '@/lib/company';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatInt, formatMoney, formatPercent, formatSignedInt } from '@/lib/format/number';
import { useMessages } from '@/lib/i18n';
import { describeEntry } from '@/lib/ledger/describe';
import { companyHref } from '@/lib/routes';
import { enums, label } from '@/messages/enums';
import { SetupGuide } from './SetupGuide';

const STAKEHOLDER_COLORS = ['#0f766e', '#5eead4', '#1e3a8a', '#93c5fd', '#7c3aed', '#c4b5fd', '#be185d', '#f9a8d4'];
const AWARD_COLOR = '#b45309';
const POOL_COLOR = '#cbd5e1';

function colorsOf(slices: OwnershipSlice[]): string[] {
  let next = 0;
  return slices.map((slice) => {
    if (slice.category === 'GRANTED_AWARDS') {
      return AWARD_COLOR;
    }
    if (slice.category === 'POOL_AVAILABLE') {
      return POOL_COLOR;
    }
    return STAKEHOLDER_COLORS[next++ % STAKEHOLDER_COLORS.length] ?? '#0f766e';
  });
}

function Ownership({ data }: { data: Dashboard }) {
  const m = useMessages();
  const { companyId } = useCompany();
  const colors = colorsOf(data.ownership);
  const name = (slice: OwnershipSlice) =>
    slice.category === 'GRANTED_AWARDS'
      ? m.dashboard.grantedAwards(slice.holderCount)
      : slice.category === 'POOL_AVAILABLE'
        ? m.dashboard.poolAvailable
        : (slice.label ?? '—');

  return (
    <Panel
      title={m.dashboard.ownershipTitle}
      aside={
        <Link href={companyHref('capTable', companyId)} className="font-semibold">
          {m.dashboard.ownershipLink}
        </Link>
      }
      bodyClassName="flex flex-col gap-4 py-5"
    >
      {data.ownership.length === 0 ? (
        <p className="px-5 text-slate-600">{m.dashboard.ownershipEmpty}</p>
      ) : (
        <>
          <div
            role="img"
            aria-label={m.dashboard.ownershipBar}
            className="mx-5 flex h-9 gap-0.5 overflow-hidden rounded-lg"
          >
            {data.ownership.map((slice, i) => (
              // Width is layout only: the percentage text shown to people is the server's string.
              <div
                key={`${slice.category}-${slice.stakeholderId ?? i}`}
                style={{ width: `${slice.percent}%`, background: colors[i] }}
                title={`${name(slice)} ${formatPercent(slice.percent)}`}
              />
            ))}
          </div>
          <TableWrap>
            <table className="eqty-table">
              <thead>
                <tr>
                  <th>{m.dashboard.ownershipHolder}</th>
                  <th className="hidden text-right sm:table-cell">{m.dashboard.ownershipShares}</th>
                  <th className="text-right">{m.dashboard.ownershipPercent}</th>
                </tr>
              </thead>
              <tbody>
                {data.ownership.map((slice, i) => (
                  <tr key={`${slice.category}-${slice.stakeholderId ?? i}`}>
                    <td>
                      <span className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="size-3 shrink-0 rounded-[3px]"
                          style={{ background: colors[i] }}
                        />
                        <span className="min-w-0 truncate font-medium">{name(slice)}</span>
                      </span>
                    </td>
                    <td className="num hidden sm:table-cell">{formatInt(slice.fullyDiluted)}</td>
                    <td className="num font-semibold">{formatPercent(slice.percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </>
      )}
    </Panel>
  );
}

function DashboardView({ data, picksDate }: { data: Dashboard; picksDate: boolean }) {
  const m = useMessages();
  const { companyId } = useCompany();
  const { kpis } = data;
  // Before the first issue the ledger has nothing to show, so walk the owner through setting it up instead.
  // Only for today's view: on a date picked before the first issue an empty ledger is just history.
  const settingUp = !picksDate && !data.ownership.some((slice) => slice.category === 'STAKEHOLDER_SHARES');
  const used = kpis.pool.size === 0 ? 0 : (kpis.pool.availableQuantity / kpis.pool.size) * 100; // bar width only

  return (
    <>
      {data.attention.unacceptedGrantCount > 0 && (
        <Alert
          tone="warning"
          title={m.dashboard.unaccepted(data.attention.unacceptedGrantCount)}
          actions={
            <ButtonLink href={companyHref('stakeholders', companyId)} variant="secondary">
              {m.dashboard.unacceptedAction}
            </ButtonLink>
          }
        >
          {m.dashboard.unacceptedHint}
        </Alert>
      )}

      {settingUp ? (
        <>
          <SetupGuide data={data} />
          {data.recentActivity.length > 0 && <RecentActivity data={data} />}
        </>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Kpi
              label={m.dashboard.kpiOutstanding}
              value={formatInt(kpis.outstandingShares)}
              sub={m.dashboard.kpiOutstandingSub(formatInt(kpis.authorizedShares))}
            />
            <Kpi
              label={m.dashboard.kpiFullyDiluted}
              value={formatInt(kpis.fullyDilutedShares)}
              sub={m.dashboard.kpiFullyDilutedSub}
            />
            <Kpi
              label={m.dashboard.kpiPool}
              value={
                <>
                  {formatInt(kpis.pool.availableQuantity)}{' '}
                  <span className="text-[15px] font-normal text-slate-500">/ {formatInt(kpis.pool.size)}</span>
                </>
              }
            >
              <div className="mt-1">
                <ProgressBar percent={used} label={m.dashboard.kpiPool} />
              </div>
            </Kpi>
            <Kpi
              label={m.dashboard.kpiPrice}
              value={kpis.pricePerShare ? formatMoney(kpis.pricePerShare.pricePerShare) : m.dashboard.kpiPriceNone}
              sub={
                kpis.pricePerShare
                  ? m.dashboard.kpiPriceSub(
                      formatDate(kpis.pricePerShare.effectiveDate),
                      label(enums.priceSource, kpis.pricePerShare.source),
                    )
                  : undefined
              }
            />
          </div>

          {/* Who owns what next to what is about to change; the activity feed runs full width below. */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Ownership data={data} />
            <Upcoming data={data} />
          </div>

          <RecentActivity data={data} />
        </>
      )}
    </>
  );
}

function Upcoming({ data }: { data: Dashboard }) {
  const m = useMessages();
  return (
    <Panel title={m.dashboard.upcomingTitle} aside={m.dashboard.upcomingNote}>
      {data.upcomingVesting.length === 0 ? (
        <p className="px-5 py-8 text-center text-slate-600">{m.dashboard.upcomingEmpty}</p>
      ) : (
        <ul>
          {data.upcomingVesting.map((item) => (
            <li
              key={`${item.grantId}-${item.vestingDate}`}
              className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-5 py-3.5 last:border-b-0"
            >
              <span className="font-mono text-[13px] text-slate-600">{formatDate(item.vestingDate)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{item.stakeholderName}</span>
                <span className="block text-[12.5px] text-slate-600">
                  {formatInt(item.cumulativeQuantity - item.quantity)} → {formatInt(item.cumulativeQuantity)} /{' '}
                  {formatInt(item.grantQuantity)}
                </span>
              </span>
              <span className="text-brand font-mono font-semibold">{formatSignedInt(item.quantity)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function RecentActivity({ data }: { data: Dashboard }) {
  const m = useMessages();
  const { companyId } = useCompany();
  return (
    <Panel
      title={m.dashboard.recentTitle}
      aside={
        <Link href={companyHref('ledger', companyId)} className="font-semibold">
          {m.dashboard.recentLink}
        </Link>
      }
    >
      {data.recentActivity.length === 0 ? (
        <p className="px-5 py-8 text-center text-slate-600">{m.dashboard.recentEmpty}</p>
      ) : (
        <ul>
          {data.recentActivity.map((entry) => (
            <li
              key={entry.entryId}
              className="flex flex-col gap-0.5 border-b border-slate-100 px-5 py-3.5 last:border-b-0 lg:flex-row lg:items-center lg:justify-between lg:gap-6"
            >
              <div className={entry.voided ? 'text-slate-500 line-through' : undefined}>
                <strong>{label(enums.ledgerType, entry.type)}</strong> {describeEntry(entry)}
                {entry.voided && (
                  <Badge tone="danger" className="ml-2 no-underline">
                    {m.dashboard.voided}
                  </Badge>
                )}
              </div>
              <div className="text-[12.5px] text-slate-600 lg:shrink-0 lg:text-right">
                {m.dashboard.effective} {formatDate(entry.effectiveDate)} · {m.dashboard.recorded}{' '}
                {formatDateTime(entry.recordedAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function DashboardPage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const [asOfDate, setAsOfDate] = useState('');
  const query = useApiQuery<Dashboard>(['c', companyId, 'dashboard'], `/bff/v1/companies/${companyId}/dashboard`, {
    query: { asOfDate },
    keepPrevious: true,
  });
  const canWrite = company.role === 'OWNER' || company.role === 'ADMIN';

  return (
    <RoleGate route="dashboard">
      <PageHeader
        title={query.data?.company.name ?? company.name}
        subtitle={
          query.data &&
          m.dashboard.subtitle(
            label(m.enums.entityType, query.data.company.entityType),
            query.data.company.currency,
            query.data.company.ledgerVersion,
          )
        }
        actions={
          <>
            <AsOfDateField
              label={m.common.asOfDate}
              value={asOfDate || query.data?.asOfDate || ''}
              onChange={setAsOfDate}
            />
            {canWrite && (
              <>
                <ButtonLink href={companyHref('transactions', companyId)} variant="secondary">
                  {m.dashboard.recordTransaction}
                </ButtonLink>
                <ButtonLink href={companyHref('newGrant', companyId)}>{m.dashboard.newGrant}</ButtonLink>
              </>
            )}
          </>
        }
      />
      <Async query={query}>{(data) => <DashboardView data={data} picksDate={asOfDate !== ''} />}</Async>
    </RoleGate>
  );
}
