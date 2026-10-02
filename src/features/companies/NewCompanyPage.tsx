'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Logo } from '@/components/layout/Logo';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { Card } from '@/components/ui/Layout';
import { WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useWrite } from '@/lib/api/hooks';
import type { Company, CreateCompanyRequest, EntityType } from '@/lib/api/types';
import { PICKER_KEY } from '@/lib/company';
import { useMessages } from '@/lib/i18n';
import { CHOOSE_PATH, companyHref, homeRouteOf } from '@/lib/routes';
import { enums } from '@/messages/enums';

const ENTITY_TYPES = Object.keys(enums.entityType) as EntityType[];
const CURRENCIES = ['VND', 'USD', 'SGD', 'EUR'];

function Form() {
  const m = useMessages();
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const write = useWrite(null);
  const [name, setName] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('JOINT_STOCK_COMPANY');
  const [currency, setCurrency] = useState('VND');
  const [incorporationDate, setIncorporationDate] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body: CreateCompanyRequest = { name: name.trim(), entityType, currency, incorporationDate: incorporationDate || null };
    const response = await write.run<Company>('/api/v1/companies', body, { keepCache: true });
    if (response) {
      await client.invalidateQueries({ queryKey: PICKER_KEY });
      toast.success(m.companies.created(response.data.name));
      router.replace(companyHref(homeRouteOf('OWNER'), response.data.id));
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-7 px-6 py-12">
      <Logo />
      <Card className="flex w-full max-w-[520px] flex-col gap-5 p-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">{m.companies.newTitle}</h1>
          <p className="text-slate-600">{m.companies.newIntro}</p>
        </div>
        <WriteError error={write.error} />
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={m.companies.name} error={write.fieldErrors.name}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} invalid={Boolean(write.fieldErrors.name)} />
          </Field>
          <Field label={m.companies.entityType} error={write.fieldErrors.entityType}>
            <Select value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)}>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {enums.entityType[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={m.companies.currency} error={write.fieldErrors.currency}>
            <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </Select>
          </Field>
          <Field label={m.companies.incorporationDate} hint={m.companies.incorporationHint} error={write.fieldErrors.incorporationDate}>
            <Input type="date" value={incorporationDate} onChange={(e) => setIncorporationDate(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-4">
            <Link href={CHOOSE_PATH} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 font-semibold text-slate-900 hover:text-slate-900">
              {m.common.action.cancel}
            </Link>
            <Button type="submit" loading={write.pending} disabled={name.trim() === ''}>
              {m.companies.submit}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export function NewCompanyPage() {
  return (
    <RequireAuth>
      <Form />
    </RequireAuth>
  );
}
