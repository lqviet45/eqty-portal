'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth/AuthProvider';
import { accountUrl } from '@/lib/auth/session';
import { useCompany } from '@/lib/company';
import { useMessages } from '@/lib/i18n';
import { CHOOSE_PATH, companyHref } from '@/lib/routes';
import { Logo } from './Logo';

/** Mobile-first frame for employees: greeting + company switch on top, three tabs at the bottom. */
export function EmployeeShell({ children }: { children: ReactNode }) {
  const m = useMessages();
  const auth = useAuth();
  const { company, companyId, companies, user } = useCompany();
  const view = useSearchParams().get('v');
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    void accountUrl().then(setAccount, () => setAccount(null));
  }, []);

  const tab = (active: boolean) =>
    cn(
      'flex min-h-11 flex-col items-center gap-0.5 py-2 text-xs',
      active ? 'font-semibold text-brand' : 'text-slate-600 hover:text-slate-900',
    );

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col bg-canvas">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 pt-5 pb-4">
        <div className="min-w-0">
          <Logo size={24} className="mb-2" />
          <div className="text-[13px] text-slate-600">{m.employee.greeting}</div>
          <div className="truncate text-lg font-bold">{user.displayName}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link
            href={CHOOSE_PATH}
            aria-label={m.common.nav.switchCompany}
            className="flex min-h-11 max-w-44 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-900 hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="truncate">{company.name}</span>
            {companies.length > 1 && <Icon name="chevronDown" size={16} className="shrink-0 text-slate-600" />}
          </Link>
          <button type="button" onClick={() => void auth.logout()} className="text-[13px] text-slate-600 hover:text-slate-900">
            {m.common.nav.signOut}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav aria-label={m.common.nav.label} className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-2xl grid-cols-3 border-t border-slate-200 bg-white px-2 pb-3">
        <Link href={companyHref('portfolio', companyId)} className={tab(view !== 'schedule')} aria-current={view !== 'schedule' ? 'page' : undefined}>
          <Icon name="home" size={22} />
          {m.employee.tabOverview}
        </Link>
        <Link href={companyHref('portfolio', companyId, { v: 'schedule' })} className={tab(view === 'schedule')} aria-current={view === 'schedule' ? 'page' : undefined}>
          <Icon name="calendar" size={22} />
          {m.employee.tabSchedule}
        </Link>
        <a href={account ?? '#'} target="_blank" rel="noreferrer" className={tab(false)}>
          <Icon name="user" size={22} />
          {m.common.nav.account}
        </a>
      </nav>
    </div>
  );
}
