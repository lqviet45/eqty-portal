'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { PreviewChecks } from '@/components/checks/PreviewChecks';
import { Note } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, Input, Select, StaticValue } from '@/components/ui/Field';
import { Card, PageHeader } from '@/components/ui/Layout';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, usePreview, useWrite } from '@/lib/api/hooks';
import type { AwardType, GrantForm, GrantPreview, IssueGrantRequest, VestingPreset } from '@/lib/api/types';
import { errorFor, failedFieldErrors } from '@/lib/checks';
import { RoleGate, useCompany } from '@/lib/company';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format/date';
import { formatInt } from '@/lib/format/number';
import { parseDecimalAmount, parseWholeNumber } from '@/lib/format/parse';
import { useMessages } from '@/lib/i18n';
import { companyHref } from '@/lib/routes';
import { enums, frequencyLabel, label } from '@/messages/enums';

const FREQUENCIES = [1, 3, 6, 12];

interface State {
  stakeholderId: string;
  awardType: AwardType;
  poolId: string;
  quantity: string;
  strike: string;
  grantDate: string;
  startDate: string | null; // null: follows the grant date
  presetId: string | 'custom';
  cliff: string;
  duration: string;
  frequency: number;
  exerciseWindow: string;
}

function initial(form: GrantForm, poolFromLink: string | null): State {
  const preset = form.vestingPresets.find((p) => p.id === form.defaults.vestingPresetId);
  const pool = form.pools.find((p) => p.id === poolFromLink) ?? form.pools[0];
  return {
    stakeholderId: '',
    awardType: form.defaults.awardType,
    poolId: pool?.id ?? '',
    quantity: '',
    strike: '',
    grantDate: form.defaults.grantDate,
    startDate: null,
    presetId: preset?.id ?? 'custom',
    cliff: String(preset?.cliffMonths ?? 12),
    duration: String(preset?.durationMonths ?? 48),
    frequency: preset?.frequencyMonths ?? 1,
    exerciseWindow: String(form.defaults.exerciseWindowDays),
  };
}

function wholeOrNull(text: string): number | null {
  return text.trim() === '' ? null : parseWholeNumber(text);
}

function toRequest(s: State, currency: string): IssueGrantRequest {
  const isOption = s.awardType === 'OPTION';
  const strike = s.strike.trim();
  return {
    stakeholderId: s.stakeholderId || null,
    poolId: s.awardType === 'PHANTOM' ? null : s.poolId || null,
    awardType: s.awardType,
    quantity: wholeOrNull(s.quantity),
    strikePrice: isOption && strike !== '' ? { amount: parseDecimalAmount(strike) ?? strike, currency } : null,
    vesting: {
      startDate: s.startDate ?? s.grantDate ?? null,
      cliffMonths: wholeOrNull(s.cliff),
      durationMonths: wholeOrNull(s.duration),
      frequencyMonths: s.frequency,
    },
    exerciseWindowDays: isOption ? wholeOrNull(s.exerciseWindow) : null,
    grantDate: s.grantDate || null,
  };
}

/** Evenly spaced points of the cumulative schedule for the bar chart (display only: the numbers are the server's). */
function samplePoints<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) {
    return [...items];
  }
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)] as T);
}

function Form({ form }: { form: GrantForm }) {
  const m = useMessages();
  const t = m.grants;
  const router = useRouter();
  const toast = useToast();
  const { companyId } = useCompany();
  const write = useWrite(companyId);
  const poolFromLink = useSearchParams().get('pool');
  const [s, setS] = useState<State>(() => initial(form, poolFromLink));
  const set = <K extends keyof State>(key: K, value: State[K]) => setS((current) => ({ ...current, [key]: value }));

  const body = toRequest(s, form.currency);
  const check = usePreview<IssueGrantRequest, GrantPreview>(
    companyId,
    `/bff/v1/companies/${companyId}/grant-form:preview`,
    body,
  );
  const server = failedFieldErrors(check.preview?.checks);

  const local: Record<string, string> = {};
  if (s.quantity.trim() !== '' && wholeOrNull(s.quantity) === null) local.quantity = t.invalidQuantity;
  if (s.strike.trim() !== '' && parseDecimalAmount(s.strike) === null) local.strikePrice = t.invalidMoney;
  for (const [field, text] of [
    ['vesting.cliffMonths', s.cliff],
    ['vesting.durationMonths', s.duration],
    ['exerciseWindowDays', s.exerciseWindow],
  ] as const) {
    if (text.trim() !== '' && parseWholeNumber(text) === null) local[field] = t.invalidNumber;
  }
  const err = (field: string, touched = true) => errorFor(field, local, write.fieldErrors, touched ? server : {});

  function pickPreset(preset: VestingPreset) {
    setS((current) => ({
      ...current,
      presetId: preset.id,
      cliff: String(preset.cliffMonths),
      duration: String(preset.durationMonths),
      frequency: preset.frequencyMonths,
    }));
  }

  async function submit() {
    const response = await write.run(`/api/v1/companies/${companyId}/grants`, body, { ifMatch: check.ledgerVersion });
    if (response) {
      toast.success(t.granted);
      router.push(companyHref('dashboard', companyId));
    }
  }

  const isOption = s.awardType === 'OPTION';
  const vesting = check.preview?.vesting;
  const impact = check.preview?.impact;
  const points = vesting ? samplePoints(vesting.tranches, 9) : [];
  const top = points.length > 0 ? Math.max(...points.map((p) => p.cumulativeQuantity), 1) : 1; // bar height only

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Card className="flex min-w-0 flex-[1_1_440px] flex-col gap-5 px-6 py-6">
        <WriteError error={write.error} onReload={() => write.reset()} />
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t.recipient} className="sm:col-span-2" error={err('stakeholderId', s.stakeholderId !== '')}>
              <Select
                value={s.stakeholderId}
                onChange={(e) => set('stakeholderId', e.target.value)}
                invalid={Boolean(err('stakeholderId', s.stakeholderId !== ''))}
              >
                <option value="">{t.pick}</option>
                {form.recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {t.recipientOption(
                      r.displayName,
                      label(m.enums.relationship, r.relationship),
                      r.activeGrantQuantity > 0 ? formatInt(r.activeGrantQuantity) : '',
                    )}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.awardType}>
              <Select value={s.awardType} onChange={(e) => set('awardType', e.target.value as AwardType)}>
                {form.awardTypes.map((type) => (
                  <option key={type} value={type}>
                    {enums.awardType[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.pool} error={err('poolId')}>
              <Select
                value={s.awardType === 'PHANTOM' ? '' : s.poolId}
                disabled={s.awardType === 'PHANTOM'}
                onChange={(e) => set('poolId', e.target.value)}
                invalid={Boolean(err('poolId'))}
              >
                {s.awardType === 'PHANTOM' ? (
                  <option value="">{t.poolNone}</option>
                ) : (
                  <option value="">{t.pick}</option>
                )}
                {form.pools.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t.poolOption(p.name, formatInt(p.availableQuantity))}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t.quantity} error={err('quantity', s.quantity !== '')}>
              <Input
                numeric
                inputMode="numeric"
                value={s.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                invalid={Boolean(err('quantity', s.quantity !== ''))}
              />
            </Field>
            {isOption && (
              <Field label={t.strike(form.currency)} error={err('strikePrice', s.strike !== '')}>
                <Input
                  numeric
                  inputMode="decimal"
                  value={s.strike}
                  onChange={(e) => set('strike', e.target.value)}
                  invalid={Boolean(err('strikePrice', s.strike !== ''))}
                />
              </Field>
            )}
            <Field label={t.grantDate} error={err('grantDate')}>
              <Input
                type="date"
                value={s.grantDate}
                onChange={(e) => set('grantDate', e.target.value)}
                invalid={Boolean(err('grantDate'))}
              />
            </Field>
            <Field label={t.vestingStart} error={err('vesting.startDate')}>
              <Input
                type="date"
                value={s.startDate ?? s.grantDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </Field>
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-[15px] font-bold">{t.vestingTitle}</legend>
            <div className="flex flex-wrap gap-2">
              {form.vestingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={s.presetId === preset.id}
                  onClick={() => pickPreset(preset)}
                  className={cn(
                    'h-9 rounded-full border px-3.5 text-[13px]',
                    s.presetId === preset.id
                      ? 'border-brand bg-brand-tint text-brand-strong font-semibold'
                      : 'border-slate-300 bg-white text-slate-700',
                  )}
                >
                  {label(m.enums.vestingPreset, preset.id)}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={s.presetId === 'custom'}
                onClick={() => set('presetId', 'custom')}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-[13px]',
                  s.presetId === 'custom'
                    ? 'border-brand bg-brand-tint text-brand-strong font-semibold'
                    : 'border-slate-300 bg-white text-slate-700',
                )}
              >
                {t.custom}
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={t.cliff} error={err('vesting.cliffMonths')}>
                <Input
                  numeric
                  inputMode="numeric"
                  value={s.cliff}
                  onChange={(e) => setS((c) => ({ ...c, cliff: e.target.value, presetId: 'custom' }))}
                  invalid={Boolean(err('vesting.cliffMonths'))}
                />
              </Field>
              <Field label={t.duration} error={err('vesting.durationMonths')}>
                <Input
                  numeric
                  inputMode="numeric"
                  value={s.duration}
                  onChange={(e) => setS((c) => ({ ...c, duration: e.target.value, presetId: 'custom' }))}
                  invalid={Boolean(err('vesting.durationMonths'))}
                />
              </Field>
              <Field label={t.frequency} error={err('vesting.frequencyMonths')}>
                <Select
                  value={s.frequency}
                  onChange={(e) => setS((c) => ({ ...c, frequency: Number(e.target.value), presetId: 'custom' }))}
                >
                  {[...new Set([...FREQUENCIES, s.frequency])]
                    .sort((a, b) => a - b)
                    .map((f) => (
                      <option key={f} value={f}>
                        {frequencyLabel(f)}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
          </fieldset>

          {isOption && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[15px] font-bold">{t.leaveTitle}</legend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label={t.exerciseWindow} error={err('exerciseWindowDays')}>
                  <Input
                    numeric
                    inputMode="numeric"
                    value={s.exerciseWindow}
                    onChange={(e) => set('exerciseWindow', e.target.value)}
                    invalid={Boolean(err('exerciseWindowDays'))}
                  />
                </Field>
                <StaticValue label={t.unvested}>{t.unvestedValue}</StaticValue>
              </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-4">
            <ButtonLink href={companyHref('dashboard', companyId)} variant="secondary">
              {m.common.action.cancel}
            </ButtonLink>
            <Button
              onClick={() => void submit()}
              loading={write.pending}
              disabled={!check.canSubmit || Object.keys(local).length > 0}
            >
              {t.submit}
            </Button>
          </div>
        </form>
      </Card>

      <aside className="flex min-w-[300px] flex-[1_1_380px] flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <Card className="flex flex-col gap-4 px-6 py-5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[17px] font-bold">{t.previewTitle}</h2>
            <div className="text-[13px] text-slate-600">{t.previewNote}</div>
          </div>
          {vesting ? (
            <>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="text-xs text-slate-600">
                    {vesting.cliffDate ? t.cliffOn(formatDate(vesting.cliffDate)) : t.noCliff}
                  </div>
                  <div className="font-mono text-[17px] font-bold">{formatInt(vesting.cliffQuantity)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="text-xs text-slate-600">{t.thenEvery}</div>
                  <div className="font-mono text-[17px] font-bold">{formatInt(vesting.regularTrancheQuantity)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="text-xs text-slate-600">{t.fullyVested}</div>
                  <div className="font-mono text-[17px] font-bold">{formatDate(vesting.fullyVestedDate)}</div>
                </div>
              </div>
              <div
                role="img"
                aria-label={t.chart}
                className="flex h-40 items-end gap-1.5 border-b border-slate-300 px-0.5"
              >
                {points.map((p) => (
                  <div key={p.vestingDate} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div className="font-mono text-[10.5px] text-slate-600">{formatInt(p.cumulativeQuantity)}</div>
                    <div
                      className="bg-brand w-full rounded-t"
                      style={{ height: `${Math.max(3, Math.round((p.cumulativeQuantity / top) * 120))}px` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5 px-0.5">
                {points.map((p) => (
                  <div key={p.vestingDate} className="flex-1 text-center font-mono text-[10px] text-slate-500">
                    {formatDate(p.vestingDate).slice(3)}
                  </div>
                ))}
              </div>
              <div className="text-[12.5px] text-slate-600">{t.tranches(vesting.trancheCount)}</div>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t.previewEmpty}</p>
          )}
        </Card>

        <PreviewChecks checks={check.preview?.checks} checking={check.isChecking} />
        {impact && (
          <Note>
            <ul className="flex flex-col gap-1">
              {impact.poolId && (
                <li>{t.impactPool(formatInt(impact.poolAvailableBefore), formatInt(impact.poolAvailableAfter))}</li>
              )}
              <li>{t.impactFd(formatInt(impact.fullyDilutedBefore), formatInt(impact.fullyDilutedAfter))}</li>
            </ul>
          </Note>
        )}
        <Note>{m.preview.appendOnly}</Note>
      </aside>
    </div>
  );
}

export function NewGrantPage() {
  const m = useMessages();
  const { companyId } = useCompany();
  const query = useApiQuery<GrantForm>(['c', companyId, 'grant-form'], `/bff/v1/companies/${companyId}/grant-form`);
  return (
    <RoleGate route="newGrant">
      <PageHeader
        title={m.grants.title}
        breadcrumb={
          <>
            <Link href={companyHref('equity', companyId)} className="no-underline">
              {m.grants.breadcrumbParent}
            </Link>{' '}
            / {m.grants.title}
          </>
        }
      />
      <Async query={query}>{(form) => <Form key={form.today} form={form} />}</Async>
    </RoleGate>
  );
}
