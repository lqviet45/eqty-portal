'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/icons';
import { Panel } from '@/components/ui/Layout';
import { useApiQuery } from '@/lib/api/hooks';
import type { Dashboard, Stakeholders } from '@/lib/api/types';
import { useCompany } from '@/lib/company';
import { cn } from '@/lib/cn';
import { useMessages } from '@/lib/i18n';
import { companyHref, type RouteKey } from '@/lib/routes';

interface Step {
  key: string;
  title: string;
  hint: string;
  action: string;
  route: RouteKey;
  done: boolean;
  optional?: boolean;
}

/**
 * Shown instead of a screen full of zeros while the ledger holds no issued shares. Which steps are done is
 * read off what the server already reports (authorized shares, pool size, stakeholder count); nothing is computed.
 */
export function SetupGuide({ data }: { data: Dashboard }) {
  const m = useMessages();
  const t = m.dashboard;
  const { companyId, company } = useCompany();
  const canWrite = company.role === 'OWNER' || company.role === 'ADMIN';
  // Shares the stakeholder list with the ledger filters, so opening both costs one request.
  const people = useApiQuery<Stakeholders>(
    ['c', companyId, 'stakeholders-options'],
    `/bff/v1/companies/${companyId}/stakeholders`,
  );

  if (!canWrite) {
    return (
      <Panel title={t.setupTitle} bodyClassName="px-5 py-5 text-slate-600">
        {t.setupViewerOnly}
      </Panel>
    );
  }

  const steps: Step[] = [
    {
      key: 'class',
      title: t.setupClassTitle,
      hint: t.setupClassHint,
      action: t.setupClassAction,
      route: 'equity',
      done: data.kpis.authorizedShares > 0,
    },
    {
      key: 'pool',
      title: t.setupPoolTitle,
      hint: t.setupPoolHint,
      action: t.setupPoolAction,
      route: 'equity',
      done: data.kpis.pool.size > 0,
      optional: true,
    },
    {
      key: 'holder',
      title: t.setupHolderTitle,
      hint: t.setupHolderHint,
      action: t.setupHolderAction,
      route: 'stakeholders',
      done: (people.data?.totalCount ?? 0) > 0,
    },
    {
      key: 'issue',
      title: t.setupIssueTitle,
      hint: t.setupIssueHint,
      action: t.setupIssueAction,
      route: 'transactions',
      done: false,
    },
  ];
  const next = steps.find((step) => !step.done && !step.optional);

  return (
    <Panel title={t.setupTitle} aside={t.setupIntro}>
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.key}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-5 py-4 last:border-b-0"
          >
            <Marker done={step.done}>{index + 1}</Marker>
            <div className="min-w-0 flex-[1_1_260px]">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                {step.title}
                {step.optional && <span className="text-[13px] font-normal text-slate-500">({t.setupOptional})</span>}
                {step === next && <Badge tone="brand">{t.setupNext}</Badge>}
              </div>
              <div className="text-[13.5px] text-slate-600">{step.hint}</div>
            </div>
            {step.done ? (
              <span className="text-brand text-sm font-semibold">{t.setupDone}</span>
            ) : (
              <ButtonLink href={companyHref(step.route, companyId)} variant={step === next ? 'primary' : 'secondary'}>
                {step.action}
              </ButtonLink>
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-2 border-t border-slate-200 px-5 py-1.5 text-[13.5px] text-slate-600">
        {t.setupImport}
        <ButtonLink href={companyHref('import', companyId)} variant="ghost">
          {t.setupImportLink}
        </ButtonLink>
      </div>
    </Panel>
  );
}

function Marker({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        done ? 'bg-brand text-white' : 'border border-slate-300 bg-white text-slate-600',
      )}
    >
      {done ? <Icon name="check" size={16} /> : children}
    </span>
  );
}
