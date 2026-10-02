'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useApiQuery } from '@/lib/api/hooks';
import type { CompanyPicker, PickerCompany } from '@/lib/api/types';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useMessages } from '@/lib/i18n';
import { PICKER_PATH, ROUTE_ROLES, companyHref, homeRouteOf, type RouteKey } from '@/lib/routes';

interface CompanyContextValue {
  companyId: string;
  company: PickerCompany;
  companies: PickerCompany[];
  user: { displayName: string; email: string };
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

export const PICKER_KEY = ['me', 'companies'] as const;

export function usePicker() {
  return useApiQuery<CompanyPicker>(PICKER_KEY, '/bff/v1/me/companies');
}

/** Resolves ?c=<companyId> against the user's companies; everything inside can assume a member of that company. */
export function CompanyProvider({ children }: { children: ReactNode }) {
  const m = useMessages();
  const router = useRouter();
  const companyId = useSearchParams().get('c');
  const picker = usePicker();

  useEffect(() => {
    if (!companyId) {
      router.replace(PICKER_PATH);
    }
  }, [companyId, router]);

  const value = useMemo<CompanyContextValue | null>(() => {
    const company = picker.data?.companies.find((c) => c.companyId === companyId);
    if (!picker.data || !company || !companyId) {
      return null;
    }
    return {
      companyId,
      company,
      companies: picker.data.companies,
      user: { displayName: picker.data.displayName, email: picker.data.email },
    };
  }, [picker.data, companyId]);

  if (!companyId || picker.isPending) {
    return <LoadingState />;
  }
  if (picker.error || !picker.data) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorState error={picker.error} onRetry={() => void picker.refetch()} />
      </div>
    );
  }
  if (!value) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
        <Alert
          tone="warning"
          title={m.common.error.notFoundTitle}
          actions={
            <ButtonLink href={PICKER_PATH} variant="secondary">
              {m.common.nav.switchCompany}
            </ButtonLink>
          }
        >
          {m.common.error.notFoundBody}
        </Alert>
      </div>
    );
  }
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used inside <CompanyProvider>.');
  }
  return context;
}

/** Hides a screen from roles the API would refuse; the API still enforces the rule. */
export function RoleGate({ route, children }: { route: RouteKey; children: ReactNode }) {
  const m = useMessages();
  const { company, companyId } = useCompany();
  if (ROUTE_ROLES[route].includes(company.role)) {
    return <>{children}</>;
  }
  return (
    <Alert
      tone="warning"
      title={m.common.error.noAccessTitle}
      actions={
        <ButtonLink href={companyHref(homeRouteOf(company.role), companyId)} variant="secondary">
          {m.common.action.back}
        </ButtonLink>
      }
    >
      {m.common.error.noAccessBody}
    </Alert>
  );
}
