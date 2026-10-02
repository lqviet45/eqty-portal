'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink, buttonClass } from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Layout';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useCompany } from '@/lib/company';
import { loadConfig } from '@/lib/config';
import { useMessages } from '@/lib/i18n';
import { companyHref, homeRouteOf } from '@/lib/routes';

function ToolCard({ href, title, children }: { href: string; title: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-[18px] py-4 text-slate-900 hover:border-slate-300 hover:text-slate-900"
    >
      <strong className="text-brand text-[15px]">{title}</strong>
      <span className="text-[13.5px] text-slate-600">{children}</span>
    </a>
  );
}

// The dashboard itself is a separate site (Aspire, behind Keycloak): this screen only points to it, and only
// shows the pointer to platform-admins. The dashboard enforces the role again, so hiding here is for tidiness.
export function MonitorPage() {
  const m = useMessages();
  const t = m.monitor;
  const { user } = useAuth();
  const { company, companyId } = useCompany();
  const [monitorUrl, setMonitorUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadConfig().then(
      (config) => !cancelled && setMonitorUrl(config.monitorUrl),
      () => !cancelled && setMonitorUrl(''),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user?.isPlatformAdmin) {
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

  return (
    <>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <Card className="flex flex-wrap items-center justify-between gap-5 px-7 py-6">
        <div className="flex max-w-[640px] min-w-0 flex-col gap-1.5">
          <h2 className="text-lg font-bold">{t.openTitle}</h2>
          <p className="text-slate-700">{t.openBody}</p>
          {monitorUrl && (
            <div className="font-mono text-[13px] [overflow-wrap:anywhere] text-slate-600">{monitorUrl}</div>
          )}
        </div>
        {monitorUrl && (
          <a href={monitorUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary')}>
            {t.open} <span aria-hidden="true">↗</span>
          </a>
        )}
      </Card>

      {monitorUrl === '' && (
        <Alert tone="warning" title={t.notConfiguredTitle}>
          {t.notConfiguredBody}
        </Alert>
      )}

      {monitorUrl && (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
            <ToolCard href={monitorUrl} title={t.tools.traces.title}>
              {t.tools.traces.body}
            </ToolCard>
            <ToolCard href={monitorUrl} title={t.tools.logs.title}>
              {t.tools.logs.body}
            </ToolCard>
            <ToolCard href={monitorUrl} title={t.tools.metrics.title}>
              {t.tools.metrics.body}
            </ToolCard>
          </div>
          <p className="text-[13px] text-slate-600">{t.traceTip}</p>
        </>
      )}
    </>
  );
}
