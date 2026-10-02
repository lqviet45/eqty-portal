'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useAuth } from '@/lib/auth/AuthProvider';
import { accountUrl } from '@/lib/auth/session';
import { useCompany } from '@/lib/company';
import { label } from '@/messages/enums';
import { useMessages } from '@/lib/i18n';
import { CHOOSE_PATH, ROUTES, ROUTE_ROLES, companyHref, type RouteKey } from '@/lib/routes';
import { Logo } from './Logo';

type NavKey = 'dashboard' | 'capTable' | 'stakeholders' | 'transactions' | 'equity' | 'ledger' | 'import' | 'members' | 'settings';

const MAIN: NavKey[] = ['dashboard', 'capTable', 'stakeholders', 'transactions', 'equity', 'ledger', 'import'];
const ADMIN: NavKey[] = ['members', 'settings'];

function NavLink({ route, active, onNavigate }: { route: RouteKey & NavKey; active: boolean; onNavigate?: () => void }) {
  const m = useMessages();
  const { companyId } = useCompany();
  return (
    <Link
      href={companyHref(route, companyId)}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center rounded-lg px-3 hover:text-white',
        active ? 'bg-sidebar-active font-semibold text-white' : 'text-slate-300 hover:bg-sidebar-active/60',
      )}
    >
      {m.common.nav[route]}
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const m = useMessages();
  const pathname = usePathname();
  const auth = useAuth();
  const { company, user } = useCompany();
  const [account, setAccount] = useState<string | null>(null);

  useEffect(() => {
    void accountUrl().then(setAccount, () => setAccount(null));
  }, []);

  const visible = (keys: NavKey[]) => keys.filter((key) => ROUTE_ROLES[key].includes(company.role));
  const main = visible(MAIN);
  const admin = visible(ADMIN);
  const isActive = (route: RouteKey) => pathname.startsWith(ROUTES[route]) || (route === 'transactions' && pathname.startsWith(ROUTES.newGrant));

  return (
    <div className="flex h-full flex-col gap-1">
      <div className="px-3 pt-1 pb-6">
        <Logo tone="light" />
      </div>
      <nav aria-label={m.common.nav.label} className="flex flex-col gap-1">
        {main.map((key) => (
          <NavLink key={key} route={key} active={isActive(key)} onNavigate={onNavigate} />
        ))}
        {admin.length > 0 && <div className="my-3 h-px bg-sidebar-active" />}
        {admin.map((key) => (
          <NavLink key={key} route={key} active={isActive(key)} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 border-t border-sidebar-active pt-4 text-sm">
        <div className="px-3">
          <div className="truncate font-semibold text-white" title={company.name}>
            {company.name}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge tone="brand">{label(m.enums.role, company.role)}</Badge>
            <Link href={CHOOSE_PATH} onClick={onNavigate} className="text-[13px] text-teal-300 hover:text-white">
              {m.common.nav.switchCompany}
            </Link>
          </div>
        </div>
        <div className="px-3 text-slate-300">
          <div className="truncate font-medium text-white">{user.displayName}</div>
          <div className="truncate text-[13px]">{user.email}</div>
          <div className="mt-1 flex gap-3 text-[13px]">
            {account && (
              <a href={account} className="text-teal-300 hover:text-white" target="_blank" rel="noreferrer">
                {m.common.nav.account}
              </a>
            )}
            <button type="button" onClick={() => void auth.logout()} className="text-teal-300 hover:text-white">
              {m.common.nav.signOut}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const m = useMessages();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-2.5 lg:hidden">
        <Logo tone="light" size={28} />
        <span className="mx-3 min-w-0 flex-1 truncate text-center text-sm font-semibold text-white">{company.name}</span>
        <button
          type="button"
          aria-label={m.common.nav.openMenu}
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex size-11 items-center justify-center rounded-lg text-white hover:bg-sidebar-active"
        >
          <Icon name="menu" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={m.common.nav.label}>
          <button type="button" aria-label={m.common.nav.closeMenu} className="absolute inset-0 bg-slate-900/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-sidebar p-4">
            <button
              type="button"
              aria-label={m.common.nav.closeMenu}
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 flex size-11 items-center justify-center rounded-lg text-slate-300 hover:bg-sidebar-active hover:text-white"
            >
              <Icon name="close" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto bg-sidebar p-4 lg:block">
        <SidebarContent />
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-7">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}
