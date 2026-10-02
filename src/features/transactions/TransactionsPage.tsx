'use client';

import { useState } from 'react';
import { PreviewChecks } from '@/components/checks/PreviewChecks';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Card, PageHeader, Panel, TableWrap } from '@/components/ui/Layout';
import { Note } from '@/components/ui/Alert';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, usePreview, useWrite } from '@/lib/api/hooks';
import type {
  MoneyInput,
  PriceSource,
  TransactionForm,
  TransactionPreview,
  TransactionPreviewRequest,
  TransactionType,
} from '@/lib/api/types';
import { errorFor, failedFieldErrors } from '@/lib/checks';
import { RoleGate, useCompany } from '@/lib/company';
import { formatDate } from '@/lib/format/date';
import { formatInt, formatMoney, formatPercentPlain } from '@/lib/format/number';
import { parseDecimalAmount, parseWholeNumber } from '@/lib/format/parse';
import { useMessages } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { enums } from '@/messages/enums';

const TYPES: TransactionType[] = ['ISSUE', 'TRANSFER', 'REPURCHASE', 'RECORD_PRICE'];

const ENDPOINT: Record<TransactionType, string> = {
  ISSUE: 'share-issuances',
  TRANSFER: 'share-transfers',
  REPURCHASE: 'share-repurchases',
  RECORD_PRICE: 'share-prices',
};

interface FormState {
  stakeholderId: string;
  fromStakeholderId: string;
  toStakeholderId: string;
  shareClassId: string;
  quantity: string;
  price: string;
  certificateNumber: string;
  source: PriceSource;
  note: string;
  effectiveDate: string;
}

const emptyForm = (date: string): FormState => ({
  stakeholderId: '',
  fromStakeholderId: '',
  toStakeholderId: '',
  shareClassId: '',
  quantity: '',
  price: '',
  certificateNumber: '',
  source: 'FUNDING_ROUND',
  note: '',
  effectiveDate: date,
});

/** The body shared by the preview and the write endpoint: their field names are identical (docs §7.12). */
function buildBody(type: TransactionType, f: FormState, currency: string): TransactionPreviewRequest {
  const price: MoneyInput | null =
    f.price.trim() === '' ? null : { amount: parseDecimalAmount(f.price) ?? f.price.trim(), currency };
  const quantity = f.quantity.trim() === '' ? null : parseWholeNumber(f.quantity);
  const base = { type, effectiveDate: f.effectiveDate || null };
  const orNull = (value: string) => value || null;
  switch (type) {
    case 'ISSUE':
      return {
        ...base,
        stakeholderId: orNull(f.stakeholderId),
        shareClassId: orNull(f.shareClassId),
        quantity,
        pricePerShare: price,
        certificateNumber: f.certificateNumber.trim() || null,
      };
    case 'TRANSFER':
      return {
        ...base,
        fromStakeholderId: orNull(f.fromStakeholderId),
        toStakeholderId: orNull(f.toStakeholderId),
        shareClassId: orNull(f.shareClassId),
        quantity,
        pricePerShare: price,
      };
    case 'REPURCHASE':
      return {
        ...base,
        stakeholderId: orNull(f.stakeholderId),
        shareClassId: orNull(f.shareClassId),
        quantity,
        pricePerShare: price,
      };
    case 'RECORD_PRICE':
      return { ...base, pricePerShare: price, source: f.source, note: f.note.trim() || null };
  }
}

/** Write endpoints take the preview body without the `type` discriminator. */
function writeBody(body: TransactionPreviewRequest): Omit<TransactionPreviewRequest, 'type'> {
  const { type: _type, ...rest } = body;
  void _type;
  return rest;
}

function Impact({ preview }: { preview: TransactionPreview | null }) {
  const m = useMessages();
  const t = m.transactions;
  const impact = preview?.impact;
  return (
    <Panel title={m.preview.impactTitle}>
      {!impact ? (
        <p className="px-5 py-4 text-sm text-slate-600">{m.preview.impactInvalid}</p>
      ) : (
        <>
          {impact.holders.length > 0 && (
            <TableWrap>
              <table className="eqty-table">
                <thead>
                  <tr>
                    <th>{t.impactHolder}</th>
                    <th className="text-right">{t.impactBefore}</th>
                    <th className="text-right">{t.impactAfter}</th>
                    <th className="text-right">{t.impactPercent}</th>
                  </tr>
                </thead>
                <tbody>
                  {impact.holders.map((holder) => (
                    <tr key={holder.stakeholderId}>
                      <td className="font-semibold whitespace-nowrap">{holder.name}</td>
                      <td className="num">{formatInt(holder.outstandingBefore)}</td>
                      <td className="num font-semibold">{formatInt(holder.outstandingAfter)}</td>
                      <td className="num text-slate-600">
                        {formatPercentPlain(holder.fullyDilutedPercentBefore)} →{' '}
                        {formatPercentPlain(holder.fullyDilutedPercentAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
          <ul className="flex flex-col gap-1 px-5 py-3.5 text-[13px] text-slate-600">
            {impact.priceBefore !== null || impact.priceAfter !== null ? (
              <li>
                {t.impactPrice(
                  impact.priceBefore ? formatMoney(impact.priceBefore) : t.impactNoPrice,
                  impact.priceAfter ? formatMoney(impact.priceAfter) : t.impactNoPrice,
                )}
              </li>
            ) : (
              <>
                <li>{t.impactOutstanding(formatInt(impact.outstandingBefore), formatInt(impact.outstandingAfter))}</li>
                <li>
                  {t.impactFullyDiluted(formatInt(impact.fullyDilutedBefore), formatInt(impact.fullyDilutedAfter))}
                </li>
                {impact.issuableBefore !== null && impact.issuableAfter !== null && (
                  <li>{t.impactIssuable(formatInt(impact.issuableBefore), formatInt(impact.issuableAfter))}</li>
                )}
              </>
            )}
          </ul>
        </>
      )}
    </Panel>
  );
}

function TransactionView({ form }: { form: TransactionForm }) {
  const m = useMessages();
  const t = m.transactions;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const [type, setType] = useState<TransactionType>(form.defaults.type);
  const [f, setF] = useState<FormState>(() => emptyForm(form.defaults.effectiveDate));
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((current) => ({ ...current, [key]: value }));

  const body = buildBody(type, f, form.currency);
  const check = usePreview<TransactionPreviewRequest, TransactionPreview>(
    companyId,
    `/bff/v1/companies/${companyId}/transaction-form:preview`,
    body,
  );
  const server = failedFieldErrors(check.preview?.checks);

  // Typed text that is not a number is a typo, not a missing field: say so next to the field.
  const local: Record<string, string> = {};
  if (f.quantity.trim() !== '' && parseWholeNumber(f.quantity) === null) {
    local.quantity = t.invalidQuantity;
  }
  if (f.price.trim() !== '' && parseDecimalAmount(f.price) === null) {
    local.pricePerShare = t.invalidPrice;
  }
  const err = (field: string) =>
    errorFor(field, local, write.fieldErrors, f[field as keyof FormState] === '' ? {} : server);

  const holdingsText = (id: string) => {
    const holdings = form.stakeholders.find((s) => s.id === id)?.holdings ?? [];
    return holdings.map((h) => `${formatInt(h.outstandingShares)} ${h.shareClassName}`).join(', ');
  };
  const stakeholderOptions = (withHoldings: boolean) =>
    form.stakeholders.map((s) => (
      <option key={s.id} value={s.id}>
        {s.displayName}
        {withHoldings && holdingsText(s.id) ? ` · ${t.holds(holdingsText(s.id))}` : ''}
      </option>
    ));
  const classSelect = (
    <Field label={t.shareClass} error={err('shareClassId')}>
      <Select
        value={f.shareClassId}
        onChange={(e) => set('shareClassId', e.target.value)}
        invalid={Boolean(err('shareClassId'))}
      >
        <option value="">{t.pick}</option>
        {form.shareClasses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {type === 'ISSUE' ? ` · ${t.issuable(formatInt(c.issuableShares))}` : ''}
          </option>
        ))}
      </Select>
    </Field>
  );
  const quantityField = (
    <Field label={t.quantity} error={err('quantity')}>
      <Input
        numeric
        inputMode="numeric"
        value={f.quantity}
        onChange={(e) => set('quantity', e.target.value)}
        invalid={Boolean(err('quantity'))}
      />
    </Field>
  );
  const priceField = (required: boolean) => (
    <Field
      label={required ? t.priceRequired(form.currency) : t.priceOptional(form.currency)}
      error={err('pricePerShare')}
    >
      <Input
        numeric
        inputMode="decimal"
        value={f.price}
        onChange={(e) => set('price', e.target.value)}
        invalid={Boolean(err('pricePerShare'))}
      />
    </Field>
  );

  const submitLabel = {
    ISSUE: t.submitIssue,
    TRANSFER: t.submitTransfer,
    REPURCHASE: t.submitRepurchase,
    RECORD_PRICE: t.submitPrice,
  }[type];
  const blocked = Object.keys(local).length > 0;

  async function submit() {
    const response = await write.run(`/api/v1/companies/${companyId}/${ENDPOINT[type]}`, writeBody(body), {
      ifMatch: check.ledgerVersion,
    });
    if (response) {
      toast.success(t.recorded);
      setF((current) => ({ ...emptyForm(current.effectiveDate), shareClassId: current.shareClassId }));
    }
  }

  const tabLabel: Record<TransactionType, string> = {
    ISSUE: t.tabIssue,
    TRANSFER: t.tabTransfer,
    REPURCHASE: t.tabRepurchase,
    RECORD_PRICE: t.tabPrice,
  };

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Card className="flex min-w-0 flex-[3_1_520px] flex-col gap-4.5 px-6 py-5">
        <div role="tablist" aria-label={t.tabsLabel} className="flex flex-wrap gap-0.5 rounded-lg bg-slate-200 p-[3px]">
          {TYPES.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={tab === type}
              onClick={() => setType(tab)}
              className={cn(
                'min-h-11 flex-auto rounded-md px-4',
                tab === type ? 'bg-white font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {tabLabel[tab]}
            </button>
          ))}
        </div>

        <WriteError error={write.error} onReload={() => write.reset()} />

        <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
          {type === 'ISSUE' && (
            <>
              <Field label={t.recipient} error={err('stakeholderId')}>
                <Select
                  value={f.stakeholderId}
                  onChange={(e) => set('stakeholderId', e.target.value)}
                  invalid={Boolean(err('stakeholderId'))}
                >
                  <option value="">{t.pick}</option>
                  {stakeholderOptions(false)}
                </Select>
              </Field>
              {classSelect}
              {quantityField}
              {priceField(false)}
              <Field label={t.certificate} error={err('certificateNumber')}>
                <Input
                  value={f.certificateNumber}
                  onChange={(e) => set('certificateNumber', e.target.value)}
                  placeholder={t.certificatePlaceholder}
                  maxLength={100}
                />
              </Field>
            </>
          )}
          {type === 'TRANSFER' && (
            <>
              <Field label={t.from} error={err('fromStakeholderId')}>
                <Select
                  value={f.fromStakeholderId}
                  onChange={(e) => set('fromStakeholderId', e.target.value)}
                  invalid={Boolean(err('fromStakeholderId'))}
                >
                  <option value="">{t.pick}</option>
                  {stakeholderOptions(true)}
                </Select>
              </Field>
              <Field label={t.to} error={err('toStakeholderId')}>
                <Select
                  value={f.toStakeholderId}
                  onChange={(e) => set('toStakeholderId', e.target.value)}
                  invalid={Boolean(err('toStakeholderId'))}
                >
                  <option value="">{t.pick}</option>
                  {stakeholderOptions(false)}
                </Select>
              </Field>
              {classSelect}
              {quantityField}
              {priceField(false)}
            </>
          )}
          {type === 'REPURCHASE' && (
            <>
              <Field label={t.repurchased} error={err('stakeholderId')}>
                <Select
                  value={f.stakeholderId}
                  onChange={(e) => set('stakeholderId', e.target.value)}
                  invalid={Boolean(err('stakeholderId'))}
                >
                  <option value="">{t.pick}</option>
                  {stakeholderOptions(true)}
                </Select>
              </Field>
              {classSelect}
              {quantityField}
              {priceField(false)}
            </>
          )}
          {type === 'RECORD_PRICE' && (
            <>
              {priceField(true)}
              <Field label={t.source} error={err('source')}>
                <Select value={f.source} onChange={(e) => set('source', e.target.value as PriceSource)}>
                  {form.priceSources.map((s) => (
                    <option key={s} value={s}>
                      {enums.priceSource[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t.note} className="sm:col-span-2" error={err('note')}>
                <Input value={f.note} onChange={(e) => set('note', e.target.value)} maxLength={500} />
              </Field>
              <p className="text-[13px] text-slate-600 sm:col-span-2">
                {form.pricePerShare
                  ? t.currentPrice(
                      formatMoney(form.pricePerShare.pricePerShare),
                      formatDate(form.pricePerShare.effectiveDate),
                    )
                  : t.noPrice}
              </p>
            </>
          )}
          <Field label={t.effectiveDate} hint={t.effectiveHint} error={err('effectiveDate')}>
            <Input
              type="date"
              value={f.effectiveDate}
              onChange={(e) => set('effectiveDate', e.target.value)}
              invalid={Boolean(err('effectiveDate'))}
            />
          </Field>
          <div className="flex flex-wrap gap-2.5 sm:col-span-2">
            <Button onClick={() => void submit()} loading={write.pending} disabled={!check.canSubmit || blocked}>
              {submitLabel}
            </Button>
            <Button variant="secondary" onClick={() => setF(emptyForm(form.defaults.effectiveDate))}>
              {m.common.action.reset}
            </Button>
          </div>
        </form>
        <Note>{m.preview.submitHint}</Note>
      </Card>

      {/* Stays in view while the form scrolls, so the checks answer each keystroke without hunting for them. */}
      <div className="flex min-w-0 flex-[2_1_400px] flex-col gap-5 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <PreviewChecks checks={check.preview?.checks} checking={check.isChecking} />
        <Impact preview={check.preview} />
      </div>
    </div>
  );
}

export function TransactionsPage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const query = useApiQuery<TransactionForm>(
    ['c', companyId, 'transaction-form'],
    `/bff/v1/companies/${companyId}/transaction-form`,
  );
  return (
    <RoleGate route="transactions">
      <PageHeader
        title={m.transactions.title}
        subtitle={query.data ? m.transactions.subtitle(company.name, query.data.ledgerVersion) : company.name}
      />
      <Async query={query}>{(form) => <TransactionView key={form.today} form={form} />}</Async>
    </RoleGate>
  );
}
