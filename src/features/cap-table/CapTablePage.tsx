'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { AsOfDateField } from '@/components/ui/DateField';
import { Card, PageHeader, Segmented, TableWrap } from '@/components/ui/Layout';
import { Async, EmptyState } from '@/components/ui/States';
import { download, saveBlob } from '@/lib/api/client';
import { describeError } from '@/lib/i18n';
import { useApiQuery } from '@/lib/api/hooks';
import type { CapTableGrouping, CapTableRow, CapTableScreen } from '@/lib/api/types';
import { RoleGate, useCompany } from '@/lib/company';
import { formatDate } from '@/lib/format/date';
import { formatCount, formatInt, formatMoney, formatPercentPlain } from '@/lib/format/number';
import { useMessages } from '@/lib/i18n';
import { enums, label } from '@/messages/enums';

function holderName(row: CapTableRow, grouping: CapTableGrouping, poolLabel: (name: string) => string): string {
  return row.kind === 'EQUITY_POOL' && grouping === 'STAKEHOLDER' ? poolLabel(row.label) : row.label;
}

function CapTableView({ data }: { data: CapTableScreen }) {
  const m = useMessages();
  const t = m.capTable;
  const byClass = data.groupBy === 'SHARE_CLASS';

  if (data.rows.length === 0) {
    return (
      <Card>
        <EmptyState>{t.empty}</EmptyState>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <TableWrap>
          <table className="eqty-table eqty-table--stack">
            <thead>
              <tr>
                <th>{byClass ? t.colShareClass : t.colHolder}</th>
                {!byClass && <th>{t.colRelationship}</th>}
                {!byClass && <th>{t.colClass}</th>}
                <th className="text-right">{t.colOutstanding}</th>
                <th className="text-right">{t.colOutstandingPct}</th>
                <th className="text-right">{t.colAwards}</th>
                <th className="text-right">{t.colFullyDiluted}</th>
                <th className="text-right">{t.colFullyDilutedPct}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={`${row.kind}-${row.id}-${row.shareClassId ?? ''}`}>
                  <td className="stack-title font-semibold whitespace-nowrap">
                    {holderName(row, data.groupBy, t.poolUnallocated)}
                  </td>
                  {!byClass && (
                    <td data-label={t.colRelationship} className="whitespace-nowrap text-slate-600">
                      {row.kind === 'EQUITY_POOL'
                        ? t.pool
                        : row.relationship
                          ? label(m.enums.relationship, row.relationship)
                          : '—'}
                    </td>
                  )}
                  {!byClass && (
                    <td data-label={t.colClass} className="whitespace-nowrap text-slate-600">
                      {row.shareClassName ?? '—'}
                    </td>
                  )}
                  <td data-label={t.colOutstanding} className="num">
                    {formatCount(row.outstandingShares)}
                  </td>
                  <td data-label={t.colOutstandingPct} className="num text-slate-600">
                    {row.outstandingShares === 0 ? '—' : formatPercentPlain(row.outstandingPercent)}
                  </td>
                  <td data-label={t.colAwards} className="num">
                    {formatCount(row.kind === 'EQUITY_POOL' ? row.poolAvailable : row.grantedAwards)}
                  </td>
                  <td data-label={t.colFullyDiluted} className="num">
                    {formatInt(row.fullyDiluted)}
                  </td>
                  <td data-label={t.colFullyDilutedPct} className="num font-semibold">
                    {formatPercentPlain(row.fullyDilutedPercent)}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td className="stack-title border-b-0!">{t.total}</td>
                {!byClass && <td className="border-b-0!" />}
                {!byClass && <td className="border-b-0!" />}
                <td data-label={t.colOutstanding} className="num border-b-0!">
                  {formatInt(data.totals.outstandingShares)}
                </td>
                <td data-label={t.colOutstandingPct} className="num border-b-0!">
                  100,00
                </td>
                <td data-label={t.colAwards} className="num border-b-0!">
                  {formatInt(data.totals.grantedAwards + data.totals.poolAvailable)}
                </td>
                <td data-label={t.colFullyDiluted} className="num border-b-0!">
                  {formatInt(data.totals.fullyDiluted)}
                </td>
                <td data-label={t.colFullyDilutedPct} className="num border-b-0!">
                  100,00
                </td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
      </Card>
      {data.pricePerShare && (
        <p className="text-[13px] text-slate-600">
          {t.price(formatMoney(data.pricePerShare.pricePerShare), formatDate(data.pricePerShare.effectiveDate))} ·{' '}
          {label(enums.priceSource, data.pricePerShare.source)}
        </p>
      )}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {[
          [t.noteRoundingTitle, t.noteRounding],
          [t.notePastTitle, t.notePast],
          [t.noteAwardsTitle, t.noteAwards],
        ].map(([title, body]) => (
          <Card key={title} className="flex flex-col gap-1.5 px-5 py-4">
            <div className="font-bold">{title}</div>
            <div className="text-[13.5px] text-slate-600">{body}</div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function CapTablePage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const [asOfDate, setAsOfDate] = useState('');
  const [groupBy, setGroupBy] = useState<CapTableGrouping>('STAKEHOLDER');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const query = useApiQuery<CapTableScreen>(['c', companyId, 'cap-table'], `/bff/v1/companies/${companyId}/cap-table`, {
    query: { asOfDate, groupBy },
    keepPrevious: true,
  });

  async function exportExcel() {
    setExporting(true);
    setExportError(null);
    try {
      saveBlob(
        await download(`/api/v1/companies/${companyId}/cap-table:export`, {
          query: { asOfDate: asOfDate || query.data?.asOfDate, groupBy },
        }),
      );
    } catch (error) {
      setExportError(describeError(error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <RoleGate route="capTable">
      <PageHeader
        title={m.capTable.title}
        subtitle={query.data ? m.capTable.subtitle(company.name, query.data.ledgerVersion) : company.name}
        actions={
          <>
            <AsOfDateField
              label={m.common.asOfDate}
              value={asOfDate || query.data?.asOfDate || ''}
              onChange={setAsOfDate}
            />
            <Segmented
              label={m.capTable.groupLabel}
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'STAKEHOLDER', label: m.capTable.byStakeholder },
                { value: 'SHARE_CLASS', label: m.capTable.byShareClass },
              ]}
            />
            <Button variant="secondary" onClick={() => void exportExcel()} loading={exporting} disabled={!query.data}>
              {m.common.action.downloadExcel}
            </Button>
          </>
        }
      />
      {exportError && (
        <Alert tone="error" live title={m.capTable.exportFailed}>
          {exportError}
        </Alert>
      )}
      <Async query={query}>{(data) => <CapTableView data={data} />}</Async>
    </RoleGate>
  );
}
