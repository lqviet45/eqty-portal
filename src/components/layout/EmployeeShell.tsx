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

function CompanySwitch({ className }: { className?: string }) {
  const m = useMessages();
  const { company, companies } = useCompany();
  return (
    <Link
      href={CHOOSE_PATH}
      aria-label={m.common.nav.switchCompany}
      className={cn(
        'flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-900 hover:bg-slate-50 hover:text-slate-900',
        className,
      )}
    >
      <span className="truncate">{company.name}</span>
      {companies.length > 1 && <Icon name="chevronDown" size={16} className="shrink-0 text-slate-600" />}
    </Link>
  );
}

/**
 * Employee frame. Phones (design "Cổng nhân viên (mobile)"): greeting and company switch on top, three tabs at the
 * bottom. From 1024px (design "Cổng nhân viên (web)"): the dark side menu of the admin screens, greeting above the content.
 */
export function EmployeeShell({ children }: { children: ReactNode }) {
  const m = useMessages();
  const auth = useAuth();
  const { companyId, user } = useCompany();
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
  const side = (active: boolean) =>
    cn(
      'flex min-h-11 items-center rounded-lg px-3 hover:text-white',
      active ? 'bg-sidebar-active font-semibold text-white' : 'text-slate-300 hover:bg-sidebar-active/60',
    );
  const home = companyHref('portfolio', companyId);

  return (
    <div className="flex min-h-screen">
      {/* Desktop: side menu. The column stretches to the page height, only its content sticks. */}
      <aside className="bg-sidebar hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 flex h-screen flex-col gap-1 overflow-y-auto p-4">
          <div className="px-3 pt-1 pb-6">
            <Logo tone="light" />
          </div>
          <nav aria-label={m.common.nav.label} className="flex flex-col gap-1">
            <Link href={home} aria-current="page" className={side(true)}>
              {m.employee.navOverview}
            </Link>
            <a href="#lich" className={side(false)}>
              {m.employee.navSchedule}
            </a>
            <a href="#dieu-khoan" className={side(false)}>
              {m.employee.navTerms}
            </a>
            <div className="bg-sidebar-active my-3 h-px" />
            <a href={account ?? '#'} target="_blank" rel="noreferrer" className={side(false)}>
              {m.employee.navAccount}
            </a>
          </nav>
          <div className="border-sidebar-active mt-auto border-t px-3 pt-4 text-sm">
            <div className="truncate font-medium text-white">{user.displayName}</div>
            <div className="truncate text-[13px] text-slate-300">{user.email}</div>
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="mt-1 text-[13px] text-teal-300 hover:text-white"
            >
              {m.common.nav.signOut}
            </button>
          </div>
        </div>
      </aside>

      <div className="bg-canvas mx-auto flex min-h-screen max-w-2xl min-w-0 flex-1 flex-col lg:mx-0 lg:max-w-none">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 pt-5 pb-4 lg:border-0 lg:bg-transparent lg:px-10 lg:pt-7 lg:pb-0">
          <div className="min-w-0">
            <Logo size={24} className="mb-2 lg:hidden" />
            <div className="text-[13px] text-slate-600 lg:text-[13.5px]">{m.employee.greeting}</div>
            <div className="truncate text-lg font-bold lg:text-[26px] lg:leading-tight">{user.displayName}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <CompanySwitch className="max-w-44 lg:max-w-72 lg:rounded-lg lg:px-3.5 lg:text-[13.5px]" />
            <button
              type="button"
              onClick={() => void auth.logout()}
              className="text-[13px] text-slate-600 hover:text-slate-900 lg:hidden"
            >
              {m.common.nav.signOut}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 pb-24 lg:px-10 lg:pt-5 lg:pb-12">{children}</main>

        <nav
          aria-label={m.common.nav.label}
          className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-2xl grid-cols-3 border-t border-slate-200 bg-white px-2 pb-3 lg:hidden"
        >
          <Link
            href={home}
            className={tab(view !== 'schedule')}
            aria-current={view !== 'schedule' ? 'page' : undefined}
          >
            <Icon name="home" size={22} />
            {m.employee.tabOverview}
          </Link>
          <Link
            href={companyHref('portfolio', companyId, { v: 'schedule' })}
            className={tab(view === 'schedule')}
            aria-current={view === 'schedule' ? 'page' : undefined}
          >
            <Icon name="calendar" size={22} />
            {m.employee.tabSchedule}
          </Link>
          <a href={account ?? '#'} target="_blank" rel="noreferrer" className={tab(false)}>
            <Icon name="user" size={22} />
            {m.common.nav.account}
          </a>
        </nav>
      </div>
    </div>
  );
}
