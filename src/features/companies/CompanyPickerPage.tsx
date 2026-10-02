'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { Logo } from '@/components/layout/Logo';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';
import { Async, LoadingState } from '@/components/ui/States';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePicker } from '@/lib/company';
import { formatInstantDate } from '@/lib/format/date';
import { useMessages } from '@/lib/i18n';
import { NEW_COMPANY_PATH, companyHref, homeRouteOf } from '@/lib/routes';
import type { PickerCompany } from '@/lib/api/types';
import { label } from '@/messages/enums';

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? (words[0]?.[0] ?? '') + (words[1]?.[0] ?? '') : name.slice(0, 2)).toUpperCase();
}

function CompanyCard({ company }: { company: PickerCompany }) {
  const m = useMessages();
  const line =
    company.stakeholderCount !== null
      ? m.companies.stakeholderLine(
          company.stakeholderCount,
          company.lastRecordedAt ? formatInstantDate(company.lastRecordedAt) : '',
        )
      : company.myGrantCount !== null
        ? m.companies.grantLine(company.myGrantCount)
        : '';
  return (
    <Link
      href={companyHref(homeRouteOf(company.role), company.companyId)}
      className="hover:border-brand grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-5 text-slate-900 hover:text-slate-900"
    >
      <span
        aria-hidden="true"
        className="bg-brand-tint text-brand-strong flex size-12 items-center justify-center rounded-[10px] text-lg font-bold"
      >
        {initials(company.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[17px] font-bold">{company.name}</span>
        <span className="block text-[13.5px] text-slate-600">
          {[label(m.enums.entityType, company.entityType), line].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex items-center gap-2.5">
        <Badge tone={company.role === 'OWNER' ? 'dark' : 'brand'}>{label(m.enums.role, company.role)}</Badge>
        <Icon name="chevronRight" className="text-slate-600" />
      </span>
    </Link>
  );
}

function Picker() {
  const m = useMessages();
  const router = useRouter();
  const auth = useAuth();
  const choose = useSearchParams().get('choose') === '1';
  const query = usePicker();

  const autoSelect = query.data?.autoSelectCompanyId;
  const auto = !choose && autoSelect ? query.data?.companies.find((c) => c.companyId === autoSelect) : undefined;
  useEffect(() => {
    if (auto) {
      router.replace(companyHref(homeRouteOf(auto.role), auto.companyId));
    }
  }, [auto, router]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-4 sm:px-12">
        <Logo />
        <div className="flex items-center gap-3.5">
          {query.data && (
            <div className="hidden text-right leading-tight sm:block">
              <div className="font-semibold">{query.data.displayName}</div>
              <div className="text-[13px] text-slate-600">{query.data.email}</div>
            </div>
          )}
          <Button variant="secondary" className="min-h-10 text-sm" onClick={() => void auth.logout()}>
            {m.common.nav.signOut}
          </Button>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-6 py-12">
        <Async query={query}>
          {(data) =>
            auto ? (
              <LoadingState />
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <h1 className="text-3xl font-bold">{m.companies.pickerTitle}</h1>
                  <p className="text-slate-600">
                    {data.companies.length > 0
                      ? m.companies.pickerIntro(data.companies.length)
                      : m.companies.pickerEmpty}
                  </p>
                </div>
                {data.companies.map((company) => (
                  <CompanyCard key={company.companyId} company={company} />
                ))}
                <Link
                  href={NEW_COMPANY_PATH}
                  className="hover:border-brand flex h-14 items-center justify-center gap-2.5 rounded-xl border border-dashed border-slate-400 font-semibold text-slate-900 hover:text-slate-900"
                >
                  <Icon name="plus" size={18} />
                  {m.companies.create}
                </Link>
              </>
            )
          }
        </Async>
      </main>
    </div>
  );
}

export function CompanyPickerPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingState />}>
        <Picker />
      </Suspense>
    </RequireAuth>
  );
}
