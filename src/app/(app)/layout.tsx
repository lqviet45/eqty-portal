'use client';

import { Suspense, type ReactNode } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { EmployeeShell } from '@/components/layout/EmployeeShell';
import { RequireAuth } from '@/components/layout/RequireAuth';
import { LoadingState } from '@/components/ui/States';
import { CompanyProvider, useCompany } from '@/lib/company';

function Shell({ children }: { children: ReactNode }) {
  const { company } = useCompany();
  return company.role === 'EMPLOYEE' ? <EmployeeShell>{children}</EmployeeShell> : <AdminShell>{children}</AdminShell>;
}

// Every screen of a company: signed in, company resolved from ?c=, shell chosen by role.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Suspense fallback={<LoadingState />}>
        <CompanyProvider>
          <Shell>{children}</Shell>
        </CompanyProvider>
      </Suspense>
    </RequireAuth>
  );
}
