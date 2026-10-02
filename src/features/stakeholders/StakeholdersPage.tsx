'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { PreviewChecks } from '@/components/checks/PreviewChecks';
import { Badge } from '@/components/ui/Badge';
import { Button, RowButton } from '@/components/ui/Button';
import { AsOfDateField } from '@/components/ui/DateField';
import { Field, Input, Radio, Select, StaticValue } from '@/components/ui/Field';
import { Card, PageHeader, TableWrap } from '@/components/ui/Layout';
import { Note } from '@/components/ui/Alert';
import { Async, EmptyState, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, usePreview, useWrite } from '@/lib/api/hooks';
import type {
  LeaverType,
  RegisterStakeholderRequest,
  StakeholderKind,
  StakeholderRelationship,
  StakeholderRow,
  Stakeholders,
  TerminateEmploymentRequest,
  TerminationPreview,
  UpdateStakeholderRequest,
} from '@/lib/api/types';
import { errorFor, failedFieldErrors } from '@/lib/checks';
import { RoleGate, useCompany } from '@/lib/company';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { formatDate } from '@/lib/format/date';
import { formatCount, formatInt, formatPercentPlain } from '@/lib/format/number';
import { useMessages } from '@/lib/i18n';
import { companyHref } from '@/lib/routes';
import { enums, label } from '@/messages/enums';

const RELATIONSHIPS = Object.keys(enums.relationship) as StakeholderRelationship[];
const LEAVER_TYPES = Object.keys(enums.leaverType) as LeaverType[];

type Panel = { mode: 'add' } | { mode: 'edit'; row: StakeholderRow } | { mode: 'terminate'; row: StakeholderRow };

function AddForm() {
  const m = useMessages();
  const t = m.stakeholders;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [kind, setKind] = useState<StakeholderKind>('PERSON');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState<StakeholderRelationship>('EMPLOYEE');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: RegisterStakeholderRequest = { kind, displayName: displayName.trim(), email: email.trim() || null, relationship };
    const response = await write.run(`/api/v1/companies/${companyId}/stakeholders`, body);
    if (response) {
      toast.success(t.added(body.displayName));
      setDisplayName('');
      setEmail('');
    }
  }

  return (
    <>
      <h2 className="text-[17px] font-bold">{t.addTitle}</h2>
      <WriteError error={write.error} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t.kind} error={write.fieldErrors.kind}>
          <Select value={kind} onChange={(e) => setKind(e.target.value as StakeholderKind)}>
            {(Object.keys(enums.stakeholderKind) as StakeholderKind[]).map((k) => (
              <option key={k} value={k}>{enums.stakeholderKind[k]}</option>
            ))}
          </Select>
        </Field>
        <Field label={t.displayName} error={write.fieldErrors.displayName}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t.displayNamePlaceholder} maxLength={200} invalid={Boolean(write.fieldErrors.displayName)} required />
        </Field>
        <Field label={t.emailOptional} error={write.fieldErrors.email}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder} invalid={Boolean(write.fieldErrors.email)} />
        </Field>
        <Field label={t.relationship} error={write.fieldErrors.relationship}>
          <Select value={relationship} onChange={(e) => setRelationship(e.target.value as StakeholderRelationship)}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>{enums.relationship[r]}</option>
            ))}
          </Select>
        </Field>
        <Note>{t.addNote}</Note>
        <div>
          <Button type="submit" loading={write.pending} disabled={displayName.trim() === ''}>{t.add}</Button>
        </div>
      </form>
    </>
  );
}

function EditForm({ row, onAdd }: { row: StakeholderRow; onAdd: () => void }) {
  const m = useMessages();
  const t = m.stakeholders;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [displayName, setDisplayName] = useState(row.displayName);
  const [email, setEmail] = useState(row.email ?? '');
  const [relationship, setRelationship] = useState(row.relationship);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: UpdateStakeholderRequest = { displayName: displayName.trim(), email: email.trim() || null, relationship };
    if (await write.run(`/api/v1/companies/${companyId}/stakeholders/${row.id}:update`, body)) {
      toast.success(t.saved);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-bold">{t.editTitle}</h2>
        <div className="text-[13.5px] text-slate-600">{row.displayName}</div>
      </div>
      <WriteError error={write.error} />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <StaticValue label={t.kind}>{t.kindFixed(label(m.enums.stakeholderKind, row.kind))}</StaticValue>
        <Field label={t.displayName} error={write.fieldErrors.displayName}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={200} invalid={Boolean(write.fieldErrors.displayName)} required />
        </Field>
        <Field label={t.email} error={write.fieldErrors.email}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={Boolean(write.fieldErrors.email)} />
        </Field>
        <Field label={t.relationship} error={write.fieldErrors.relationship}>
          <Select value={relationship} onChange={(e) => setRelationship(e.target.value as StakeholderRelationship)}>
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>{enums.relationship[r]}</option>
            ))}
          </Select>
        </Field>
        <Note>{t.editNote}</Note>
        <div className="flex gap-2.5">
          <Button type="submit" loading={write.pending} disabled={displayName.trim() === ''}>{m.common.action.save}</Button>
          <Button variant="secondary" onClick={onAdd}>{t.addAnother}</Button>
        </div>
      </form>
    </>
  );
}

function TerminateForm({ row, onCancel }: { row: StakeholderRow; onCancel: () => void }) {
  const m = useMessages();
  const t = m.stakeholders;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [leaverType, setLeaverType] = useState<LeaverType | ''>('');
  const [terminationDate, setTerminationDate] = useState('');

  const body: TerminateEmploymentRequest = { leaverType: leaverType || null, terminationDate: terminationDate || null };
  const check = usePreview<TerminateEmploymentRequest, TerminationPreview>(companyId, `/bff/v1/companies/${companyId}/stakeholders/${row.id}/termination:preview`, body);
  const fields = failedFieldErrors(check.preview?.checks);

  async function confirm() {
    const response = await write.run(`/api/v1/companies/${companyId}/stakeholders/${row.id}:terminateEmployment`, body, { ifMatch: check.ledgerVersion });
    if (response) {
      toast.success(t.terminated(row.displayName));
      onCancel();
    }
  }

  const totals = check.preview?.totals;
  return (
    <>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[17px] font-bold">{t.terminateTitle}</h2>
        <div className="text-[13.5px] text-slate-600">{row.displayName}</div>
      </div>
      <WriteError error={write.error} onReload={() => write.reset()} />
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
        <Field label={t.terminationDate} error={errorFor('terminationDate', write.fieldErrors) ?? (terminationDate ? errorFor('terminationDate', fields) : undefined)}>
          <Input type="date" value={terminationDate} onChange={(e) => setTerminationDate(e.target.value)} />
        </Field>
        <fieldset className="flex flex-col">
          <legend className="mb-1.5 text-[13px] font-semibold text-slate-700">{t.leaverType}</legend>
          {LEAVER_TYPES.map((type) => (
            <Radio key={type} name="leaver" label={enums.leaverType[type]} checked={leaverType === type} onChange={() => setLeaverType(type)} />
          ))}
        </fieldset>

        <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3.5">
          <div className="mb-1.5 text-[13px] font-bold tracking-wide text-amber-800 uppercase">{t.impactTitle}</div>
          {totals && check.preview ? (
            <ul className="flex list-disc flex-col gap-1 pl-4.5 text-sm text-slate-700">
              {check.preview.grants.map((grant) => (
                <li key={grant.grantId}>
                  {t.impactGrant(label(m.enums.awardTypeShort, grant.awardType).toLowerCase(), formatInt(grant.quantity))}
                  <br />
                  {t.impactVested(formatInt(grant.vestedQuantity), formatInt(grant.forfeitedQuantity), grant.poolName ?? '')}
                  {grant.exerciseDeadlineDate && (
                    <>
                      <br />
                      {t.impactDeadline(formatDate(grant.exerciseDeadlineDate))}
                    </>
                  )}
                </li>
              ))}
              <li>{t.impactTotals(formatInt(totals.vestedQuantity), formatInt(totals.forfeitedQuantity), formatInt(totals.returnedToPools))}</li>
            </ul>
          ) : (
            <p className="text-sm text-slate-600">{t.impactEmpty}</p>
          )}
        </div>

        <PreviewChecks bare checks={check.preview?.checks} checking={check.isChecking} />
        <Note>{t.terminateNote}</Note>
        <div className="flex gap-2.5">
          <Button variant="danger" onClick={() => void confirm()} loading={write.pending} disabled={!check.canSubmit}>{t.confirmTerminate}</Button>
          <Button variant="secondary" onClick={onCancel}>{m.common.action.cancel}</Button>
        </div>
      </form>
    </>
  );
}

export function StakeholdersPage() {
  const m = useMessages();
  const t = m.stakeholders;
  const { companyId, company } = useCompany();
  const [asOfDate, setAsOfDate] = useState('');
  const [q, setQ] = useState('');
  const [relationship, setRelationship] = useState('');
  const [employment, setEmployment] = useState('');
  const [panel, setPanel] = useState<Panel | null>(null);
  const debouncedQ = useDebouncedValue(q, 300);
  const canWrite = company.role === 'OWNER' || company.role === 'ADMIN';

  const query = useApiQuery<Stakeholders>(['c', companyId, 'stakeholders'], `/bff/v1/companies/${companyId}/stakeholders`, {
    query: { asOfDate, q: debouncedQ.trim(), relationship, employment },
    keepPrevious: true,
  });
  const showAccount = query.data?.items.some((item) => item.account !== null) ?? false;

  return (
    <RoleGate route="stakeholders">
      <PageHeader
        title={t.title}
        subtitle={query.data ? t.subtitle(company.name, query.data.totalCount, formatDate(query.data.asOfDate)) : company.name}
        actions={canWrite && <Button onClick={() => setPanel({ mode: 'add' })}>{t.add}</Button>}
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-11 min-w-[260px] flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-slate-600">
          <span className="whitespace-nowrap">{t.search}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPlaceholder} aria-label={t.searchLabel} maxLength={200} className="min-w-0 flex-1 bg-transparent px-2 text-slate-900" />
        </label>
        <Select aria-label={t.filterRelationship} value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">{t.allRelationships}</option>
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>{enums.relationship[r]}</option>
          ))}
        </Select>
        <Select aria-label={t.filterEmployment} value={employment} onChange={(e) => setEmployment(e.target.value)} className="w-auto min-w-[180px]">
          <option value="">{t.allEmployment}</option>
          <option value="ACTIVE">{enums.employment.ACTIVE}</option>
          <option value="TERMINATED">{enums.employment.TERMINATED}</option>
        </Select>
        <AsOfDateField label={m.common.asOfDate} value={asOfDate || query.data?.asOfDate || ''} onChange={setAsOfDate} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Card className="min-w-0 flex-[1_1_640px] overflow-hidden">
          <Async query={query}>
            {(data) =>
              data.items.length === 0 ? (
                <EmptyState>{data.totalCount === 0 ? t.empty : m.common.state.noMatch}</EmptyState>
              ) : (
                <>
                  <TableWrap>
                    <table className="eqty-table">
                      <thead>
                        <tr>
                          <th>{t.colHolder}</th>
                          <th>{t.colKind}</th>
                          <th>{t.colRelationship}</th>
                          <th className="text-right">{t.colOutstanding}</th>
                          <th className="text-right">{t.colAwards}</th>
                          <th className="text-right">{t.colPercent}</th>
                          <th>{t.colStatus}</th>
                          {showAccount && <th>{t.colAccount}</th>}
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((row) => {
                          const selected = panel && panel.mode !== 'add' && panel.row.id === row.id;
                          return (
                            <tr key={row.id} className={selected ? 'bg-teal-50' : undefined}>
                              <td className="whitespace-nowrap">
                                <div className="font-semibold">{row.displayName}</div>
                                <div className="text-[13px] text-slate-600">{row.email ?? '—'}</div>
                              </td>
                              <td className="whitespace-nowrap text-slate-600">{label(m.enums.stakeholderKind, row.kind)}</td>
                              <td className="whitespace-nowrap text-slate-600">{label(m.enums.relationship, row.relationship)}</td>
                              <td className="num">{formatCount(row.outstandingShares)}</td>
                              <td className="num">{formatCount(row.grantedAwards)}</td>
                              <td className="num font-semibold">{formatPercentPlain(row.fullyDilutedPercent)}</td>
                              <td className="whitespace-nowrap">
                                <Badge tone={row.employment.status === 'ACTIVE' ? 'success' : 'neutral'}>
                                  {row.employment.status === 'TERMINATED' && row.employment.terminationDate ? t.terminatedOn(formatDate(row.employment.terminationDate)) : label(m.enums.employment, row.employment.status)}
                                </Badge>
                              </td>
                              {showAccount && (
                                <td className="whitespace-nowrap text-slate-600">
                                  {row.account ? (row.account.status === 'MEMBER' && row.account.role ? label(m.enums.role, row.account.role) : label(m.enums.account, row.account.status)) : '—'}
                                </td>
                              )}
                              <td className="text-right whitespace-nowrap">
                                {row.actions.edit && <RowButton onClick={() => setPanel({ mode: 'edit', row })}>{m.common.action.edit}</RowButton>}
                                {row.actions.terminate && <RowButton tone="danger" onClick={() => setPanel({ mode: 'terminate', row })}>{t.terminate}</RowButton>}
                                <Link href={companyHref('portfolio', companyId, { s: row.id })} className="px-2 text-[13.5px] font-semibold">{t.portfolio}</Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </TableWrap>
                  <div className="border-t border-slate-200 px-4 py-3 text-[13px] text-slate-600">{t.matched(data.matchedCount, data.totalCount)}</div>
                </>
              )
            }
          </Async>
        </Card>

        {panel && canWrite && (
          <aside className="flex min-w-[300px] flex-[0_1_380px] flex-col gap-4 rounded-xl border border-slate-200 bg-white px-6 py-5">
            {panel.mode === 'add' && <AddForm />}
            {panel.mode === 'edit' && <EditForm key={panel.row.id} row={panel.row} onAdd={() => setPanel({ mode: 'add' })} />}
            {panel.mode === 'terminate' && <TerminateForm key={panel.row.id} row={panel.row} onCancel={() => setPanel(null)} />}
          </aside>
        )}
      </div>
    </RoleGate>
  );
}

