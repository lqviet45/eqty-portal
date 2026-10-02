'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Note } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Card, PageHeader } from '@/components/ui/Layout';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery, useWrite } from '@/lib/api/hooks';
import type { Company, UpdateCompanyRequest } from '@/lib/api/types';
import { PICKER_KEY, RoleGate, useCompany } from '@/lib/company';
import { formatInstantDate } from '@/lib/format/date';
import { useMessages } from '@/lib/i18n';
import { companyHref } from '@/lib/routes';
import { label } from '@/messages/enums';

function SettingsForm({ company }: { company: Company }) {
  const m = useMessages();
  const t = m.settings;
  const client = useQueryClient();
  const toast = useToast();
  const { companyId } = useCompany();
  const write = useWrite(companyId);
  const [name, setName] = useState(company.name);
  const [date, setDate] = useState(company.incorporationDate ?? '');
  const dirty = name.trim() !== company.name || date !== (company.incorporationDate ?? '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: UpdateCompanyRequest = { name: name.trim(), incorporationDate: date || null };
    if (await write.run(`/api/v1/companies/${companyId}:update`, body)) {
      await client.invalidateQueries({ queryKey: PICKER_KEY });
      toast.success(t.saved);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Card className="min-w-0 flex-[1_1_460px] px-7 py-6">
        <form onSubmit={submit} className="flex flex-col gap-4.5">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-bold">{t.generalTitle}</h2>
            <div className="text-[13.5px] text-slate-600">{t.generalHint}</div>
          </div>
          <WriteError error={write.error} />
          <Field label={t.name} error={write.fieldErrors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required invalid={Boolean(write.fieldErrors.name)} />
          </Field>
          <Field label={t.incorporationDate} hint={t.incorporationHint} error={write.fieldErrors.incorporationDate}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} invalid={Boolean(write.fieldErrors.incorporationDate)} />
          </Field>
          <Note>{t.note}</Note>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" loading={write.pending} disabled={!dirty || name.trim() === ''}>{m.common.action.save}</Button>
            <Button variant="secondary" disabled={!dirty} onClick={() => { setName(company.name); setDate(company.incorporationDate ?? ''); }}>{t.undo}</Button>
          </div>
        </form>
      </Card>

      <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
        <Card className="flex flex-col gap-3.5 px-7 py-6">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-bold">{t.fixedTitle}</h2>
            <div className="text-[13.5px] text-slate-600">{t.fixedHint}</div>
          </div>
          <dl className="grid grid-cols-[130px_minmax(0,1fr)] gap-x-3 gap-y-2.5 text-[14.5px]">
            <dt className="text-slate-600">{t.entityType}</dt>
            <dd className="font-semibold">{label(m.enums.entityType, company.entityType)}</dd>
            <dt className="text-slate-600">{t.currency}</dt>
            <dd className="font-semibold">{company.currency}</dd>
            <dt className="text-slate-600">{t.createdAt}</dt>
            <dd>{formatInstantDate(company.createdAt)}</dd>
            <dt className="text-slate-600">{t.companyId}</dt>
            <dd className="font-mono text-[13px] [overflow-wrap:anywhere]">{company.id}</dd>
          </dl>
        </Card>
        <Card className="flex flex-col gap-2.5 px-7 py-5">
          <h2 className="text-base font-bold">{t.othersTitle}</h2>
          <Link href={companyHref('members', companyId)} className="font-semibold">{t.linkMembers}</Link>
          <Link href={companyHref('equity', companyId)} className="font-semibold">{t.linkEquity}</Link>
        </Card>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const m = useMessages();
  const { companyId, company } = useCompany();
  const query = useApiQuery<Company>(['c', companyId, 'company'], `/api/v1/companies/${companyId}`);
  return (
    <RoleGate route="settings">
      <PageHeader title={m.settings.title} subtitle={m.settings.subtitle(company.name)} />
      <Async query={query}>{(data) => <SettingsForm key={`${data.name}-${data.incorporationDate}`} company={data} />}</Async>
    </RoleGate>
  );
}
