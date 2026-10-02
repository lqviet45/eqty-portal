'use client';

import { useState } from 'react';
import { PreviewChecks } from '@/components/checks/PreviewChecks';
import { Note } from '@/components/ui/Alert';
import { Button, RowButton } from '@/components/ui/Button';
import { Field, Input, Select, StaticValue } from '@/components/ui/Field';
import { Card, PageHeader, Panel, ProgressBar, TableWrap } from '@/components/ui/Layout';
import { Async, EmptyState, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, usePreview, useWrite } from '@/lib/api/hooks';
import type { EquityAction, EquityPreview, EquityPreviewRequest, EquityScreen, ShareClassKind } from '@/lib/api/types';
import { errorFor, failedFieldErrors } from '@/lib/checks';
import { RoleGate, useCompany } from '@/lib/company';
import { formatDate } from '@/lib/format/date';
import { formatCount, formatInt } from '@/lib/format/number';
import { parseWholeNumber } from '@/lib/format/parse';
import { useMessages } from '@/lib/i18n';
import { companyHref } from '@/lib/routes';
import { enums, label } from '@/messages/enums';
import Link from 'next/link';

type PoolRow = EquityScreen['pools'][number];
type ClassRow = EquityScreen['shareClasses'][number];

type Mode =
  | { action: 'RESIZE_POOL'; pool: PoolRow }
  | { action: 'SET_AUTHORIZED_SHARES'; shareClass: ClassRow }
  | { action: 'CREATE_POOL' }
  | { action: 'CREATE_SHARE_CLASS' };

/** Which write endpoint each action maps to (docs §7.11). */
function writeTarget(
  companyId: string,
  mode: Mode,
  body: EquityPreviewRequest,
): { path: string; body: Record<string, unknown> } {
  const base = `/api/v1/companies/${companyId}`;
  const date = body.effectiveDate;
  switch (mode.action) {
    case 'RESIZE_POOL':
      return { path: `${base}/equity-pools/${mode.pool.id}:resize`, body: { size: body.size, effectiveDate: date } };
    case 'SET_AUTHORIZED_SHARES':
      return {
        path: `${base}/share-classes/${mode.shareClass.id}:setAuthorizedShares`,
        body: { authorizedShares: body.authorizedShares, effectiveDate: date },
      };
    case 'CREATE_POOL':
      return {
        path: `${base}/equity-pools`,
        body: { shareClassId: body.shareClassId, name: body.name, size: body.size, effectiveDate: date },
      };
    case 'CREATE_SHARE_CLASS':
      return {
        path: `${base}/share-classes`,
        body: {
          name: body.name,
          kind: body.kind,
          votesPerShare: body.votesPerShare,
          authorizedShares: body.authorizedShares,
          effectiveDate: date,
        },
      };
  }
}

function ActionForm({ mode, screen, onDone }: { mode: Mode; screen: EquityScreen; onDone: () => void }) {
  const m = useMessages();
  const t = m.equity;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);

  // Today in Vietnam comes from the server (the screen's as-of date), not from the browser's UTC clock.
  const [date, setDate] = useState(screen.asOfDate);
  const [size, setSize] = useState(mode.action === 'RESIZE_POOL' ? String(mode.pool.size) : '');
  const [authorized, setAuthorized] = useState(
    mode.action === 'SET_AUTHORIZED_SHARES' ? String(mode.shareClass.authorizedShares) : '',
  );
  const [name, setName] = useState('');
  const [shareClassId, setShareClassId] = useState('');
  const [kind, setKind] = useState<ShareClassKind>('COMMON');
  const [votes, setVotes] = useState('1');

  const num = (text: string) => (text.trim() === '' ? null : parseWholeNumber(text));
  const local: Record<string, string> = {};
  for (const [field, text] of [
    ['size', size],
    ['authorizedShares', authorized],
    ['votesPerShare', votes],
  ] as const) {
    const relevant =
      field === 'size'
        ? mode.action === 'RESIZE_POOL' || mode.action === 'CREATE_POOL'
        : field === 'authorizedShares'
          ? mode.action === 'SET_AUTHORIZED_SHARES' || mode.action === 'CREATE_SHARE_CLASS'
          : mode.action === 'CREATE_SHARE_CLASS';
    if (relevant && text.trim() !== '' && parseWholeNumber(text) === null) {
      local[field] = t.invalidNumber;
    }
  }

  const body: EquityPreviewRequest = {
    action: mode.action as EquityAction,
    poolId: mode.action === 'RESIZE_POOL' ? mode.pool.id : null,
    shareClassId:
      mode.action === 'SET_AUTHORIZED_SHARES'
        ? mode.shareClass.id
        : mode.action === 'CREATE_POOL'
          ? shareClassId || null
          : null,
    name: mode.action === 'CREATE_POOL' || mode.action === 'CREATE_SHARE_CLASS' ? name.trim() || null : null,
    kind: mode.action === 'CREATE_SHARE_CLASS' ? kind : null,
    votesPerShare: mode.action === 'CREATE_SHARE_CLASS' ? num(votes) : null,
    size: mode.action === 'RESIZE_POOL' || mode.action === 'CREATE_POOL' ? num(size) : null,
    authorizedShares:
      mode.action === 'SET_AUTHORIZED_SHARES' || mode.action === 'CREATE_SHARE_CLASS' ? num(authorized) : null,
    effectiveDate: date || null,
  };

  const check = usePreview<EquityPreviewRequest, EquityPreview>(
    companyId,
    `/bff/v1/companies/${companyId}/equity:preview`,
    body,
  );
  const server = failedFieldErrors(check.preview?.checks);
  const err = (field: string) => errorFor(field, local, write.fieldErrors, server);

  async function submit() {
    const target = writeTarget(companyId, mode, body);
    if (await write.run(target.path, target.body, { ifMatch: check.ledgerVersion })) {
      toast.success(mode.action === 'CREATE_POOL' || mode.action === 'CREATE_SHARE_CLASS' ? t.created : t.recorded);
      onDone();
    }
  }

  const impact = check.preview?.impact;
  const title = {
    RESIZE_POOL: t.resizeTitle,
    SET_AUTHORIZED_SHARES: t.authorizedTitle,
    CREATE_POOL: t.poolTitle,
    CREATE_SHARE_CLASS: t.classTitle,
  }[mode.action];
  const hint =
    mode.action === 'RESIZE_POOL'
      ? `${mode.pool.name} · ${mode.pool.shareClassName}`
      : mode.action === 'SET_AUTHORIZED_SHARES'
        ? mode.shareClass.name
        : mode.action === 'CREATE_POOL'
          ? t.poolHint
          : t.classHint;
  const submitLabel = {
    RESIZE_POOL: t.submitResize,
    SET_AUTHORIZED_SHARES: t.submitAuthorized,
    CREATE_POOL: t.submitPool,
    CREATE_SHARE_CLASS: t.submitClass,
  }[mode.action];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <div className="text-[13.5px] text-slate-600">{hint}</div>
      </div>
      <WriteError error={write.error} onReload={() => write.reset()} />
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        {mode.action === 'RESIZE_POOL' && (
          <StaticValue label={t.currentSize} mono>
            {formatInt(mode.pool.size)}
          </StaticValue>
        )}
        {mode.action === 'SET_AUTHORIZED_SHARES' && (
          <StaticValue label={t.currentAuthorized} mono>
            {formatInt(mode.shareClass.authorizedShares)}
          </StaticValue>
        )}
        {(mode.action === 'CREATE_POOL' || mode.action === 'CREATE_SHARE_CLASS') && (
          <Field label={mode.action === 'CREATE_POOL' ? t.poolName : t.className} error={err('name')}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              invalid={Boolean(err('name'))}
            />
          </Field>
        )}
        {mode.action === 'CREATE_POOL' && (
          <Field label={t.shareClass} error={err('shareClassId')}>
            <Select
              value={shareClassId}
              onChange={(e) => setShareClassId(e.target.value)}
              invalid={Boolean(err('shareClassId'))}
            >
              <option value="">{t.pick}</option>
              {screen.shareClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {mode.action === 'CREATE_SHARE_CLASS' && (
          <>
            <Field label={t.kind} error={err('kind')}>
              <Select value={kind} onChange={(e) => setKind(e.target.value as ShareClassKind)}>
                {(Object.keys(enums.shareClassKindLong) as ShareClassKind[]).map((k) => (
                  <option key={k} value={k}>
                    {enums.shareClassKindLong[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.votes} error={err('votesPerShare')}>
              <Input
                numeric
                inputMode="numeric"
                value={votes}
                onChange={(e) => setVotes(e.target.value)}
                invalid={Boolean(err('votesPerShare'))}
              />
            </Field>
          </>
        )}
        {(mode.action === 'RESIZE_POOL' || mode.action === 'CREATE_POOL') && (
          <Field label={mode.action === 'RESIZE_POOL' ? t.newSize : t.colSize} error={err('size')}>
            <Input
              numeric
              inputMode="numeric"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              invalid={Boolean(err('size'))}
            />
          </Field>
        )}
        {(mode.action === 'SET_AUTHORIZED_SHARES' || mode.action === 'CREATE_SHARE_CLASS') && (
          <Field
            label={mode.action === 'SET_AUTHORIZED_SHARES' ? t.newAuthorized : t.authorized}
            error={err('authorizedShares')}
          >
            <Input
              numeric
              inputMode="numeric"
              value={authorized}
              onChange={(e) => setAuthorized(e.target.value)}
              invalid={Boolean(err('authorizedShares'))}
            />
          </Field>
        )}
        <Field label={t.effectiveDate} error={err('effectiveDate')}>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            invalid={Boolean(err('effectiveDate'))}
          />
        </Field>

        <PreviewChecks bare checks={check.preview?.checks} checking={check.isChecking} />
        {impact && (
          <Note>
            <ul className="flex flex-col gap-1">
              {impact.poolSizeBefore !== null && impact.poolSizeAfter !== null && (
                <li>{t.impactPool(formatInt(impact.poolSizeBefore), formatInt(impact.poolSizeAfter))}</li>
              )}
              {impact.issuableBefore !== null && impact.issuableAfter !== null && (
                <li>{t.impactIssuable(formatInt(impact.issuableBefore), formatInt(impact.issuableAfter))}</li>
              )}
              <li>{t.impactFullyDiluted(formatInt(impact.fullyDilutedBefore), formatInt(impact.fullyDilutedAfter))}</li>
            </ul>
          </Note>
        )}
        <div className="flex gap-2.5">
          <Button
            onClick={() => void submit()}
            loading={write.pending}
            disabled={!check.canSubmit || Object.keys(local).length > 0}
          >
            {submitLabel}
          </Button>
          <Button variant="secondary" onClick={onDone}>
            {m.common.action.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}

function EquityView({
  screen,
  mode,
  setMode,
}: {
  screen: EquityScreen;
  mode: Mode | null;
  setMode: (mode: Mode | null) => void;
}) {
  const m = useMessages();
  const t = m.equity;
  const { companyId } = useCompany();
  const modeKey = mode
    ? `${mode.action}-${'pool' in mode ? mode.pool.id : 'shareClass' in mode ? mode.shareClass.id : ''}`
    : '';

  return (
    <div className="flex flex-wrap items-start gap-5">
      <div className="flex min-w-0 flex-[1_1_640px] flex-col gap-5">
        <Panel title={t.poolsTitle} aside={t.poolsNote(formatDate(screen.asOfDate))}>
          {screen.pools.length === 0 ? (
            <EmptyState>{t.noPools}</EmptyState>
          ) : (
            <TableWrap>
              <table className="eqty-table">
                <thead>
                  <tr>
                    <th>{t.colPool}</th>
                    <th>{t.colClass}</th>
                    <th className="text-right">{t.colSize}</th>
                    <th className="text-right">{t.colGranted}</th>
                    <th className="text-right">{t.colAvailable}</th>
                    <th>{t.colUsage}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {screen.pools.map((pool) => (
                    <tr key={pool.id}>
                      <td className="font-semibold whitespace-nowrap">{pool.name}</td>
                      <td className="text-slate-600">{pool.shareClassName}</td>
                      <td className="num">{formatInt(pool.size)}</td>
                      <td className="num">{formatInt(pool.grantedQuantity)}</td>
                      <td className="num font-semibold">{formatInt(pool.availableQuantity)}</td>
                      <td>
                        <div className="flex min-w-[150px] items-center gap-2.5">
                          <div className="flex-1">
                            <ProgressBar percent={Number(pool.usedPercent)} label={`${t.colUsage} ${pool.name}`} />
                          </div>
                          <span className="font-mono text-[12.5px] text-slate-600">
                            {Math.round(Number(pool.usedPercent))}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        {screen.actions.resizePool && (
                          <RowButton onClick={() => setMode({ action: 'RESIZE_POOL', pool })}>{t.adjust}</RowButton>
                        )}
                        {screen.actions.createPool && (
                          <Link
                            href={companyHref('newGrant', companyId, { pool: pool.id })}
                            className="px-2 text-[13.5px] font-semibold"
                          >
                            {t.grant}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>

        <Panel title={t.classesTitle} aside={t.classesNote}>
          {screen.shareClasses.length === 0 ? (
            <EmptyState>{t.noClasses}</EmptyState>
          ) : (
            <TableWrap>
              <table className="eqty-table">
                <thead>
                  <tr>
                    <th>{t.colClass}</th>
                    <th>{t.colKind}</th>
                    <th className="text-right">{t.colVotes}</th>
                    <th className="text-right">{t.colAuthorized}</th>
                    <th className="text-right">{t.colOutstanding}</th>
                    <th className="text-right">{t.colReserved}</th>
                    <th className="text-right">{t.colIssuable}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {screen.shareClasses.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold whitespace-nowrap">{c.name}</td>
                      <td className="whitespace-nowrap text-slate-600">{label(m.enums.shareClassKind, c.kind)}</td>
                      <td className="num">{formatInt(c.votesPerShare)}</td>
                      <td className="num">{formatInt(c.authorizedShares)}</td>
                      <td className="num">{formatInt(c.outstandingShares)}</td>
                      <td className="num">{formatCount(c.reservedForPools)}</td>
                      <td className="num font-semibold">{formatInt(c.issuableShares)}</td>
                      <td className="text-right whitespace-nowrap">
                        {screen.actions.setAuthorizedShares && (
                          <RowButton onClick={() => setMode({ action: 'SET_AUTHORIZED_SHARES', shareClass: c })}>
                            {t.setAuthorized}
                          </RowButton>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td className="border-b-0!">{t.total}</td>
                    <td className="border-b-0!" />
                    <td className="border-b-0!" />
                    <td className="num border-b-0!">{formatInt(screen.totals.authorizedShares)}</td>
                    <td className="num border-b-0!">{formatInt(screen.totals.outstandingShares)}</td>
                    <td className="num border-b-0!">{formatCount(screen.totals.reservedForPools)}</td>
                    <td className="num border-b-0!">{formatInt(screen.totals.issuableShares)}</td>
                    <td className="border-b-0!" />
                  </tr>
                </tbody>
              </table>
            </TableWrap>
          )}
        </Panel>
        <Note>{t.appendOnlyNote}</Note>
      </div>

      {mode && (
        <Card className="min-w-[300px] flex-[0_1_400px] px-6 py-5">
          <ActionForm key={modeKey} mode={mode} screen={screen} onDone={() => setMode(null)} />
        </Card>
      )}
    </div>
  );
}

export function EquityPage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const query = useApiQuery<EquityScreen>(['c', companyId, 'equity'], `/bff/v1/companies/${companyId}/equity`);
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <RoleGate route="equity">
      <PageHeader
        title={m.equity.title}
        subtitle={
          query.data
            ? m.equity.subtitle(company.name, formatDate(query.data.asOfDate), query.data.company.ledgerVersion)
            : company.name
        }
        actions={
          query.data && (
            <>
              {query.data.actions.createShareClass && (
                <Button variant="secondary" onClick={() => setMode({ action: 'CREATE_SHARE_CLASS' })}>
                  {m.equity.newClass}
                </Button>
              )}
              {query.data.actions.createPool && (
                <Button variant="secondary" onClick={() => setMode({ action: 'CREATE_POOL' })}>
                  {m.equity.newPool}
                </Button>
              )}
            </>
          )
        }
      />
      <Async query={query}>{(screen) => <EquityView screen={screen} mode={mode} setMode={setMode} />}</Async>
    </RoleGate>
  );
}
