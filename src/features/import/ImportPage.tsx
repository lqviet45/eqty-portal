'use client';

import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card, PageHeader, TableWrap } from '@/components/ui/Layout';
import { Async, WriteError } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { download, saveBlob } from '@/lib/api/client';
import { useApiQuery, useWrite } from '@/lib/api/hooks';
import type { ImportScreen, ImportStatus, ImportStepState } from '@/lib/api/types';
import { RoleGate, useCompany } from '@/lib/company';
import { cn } from '@/lib/cn';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatBytes, formatInt } from '@/lib/format/number';
import { describeCode, describeError, useMessages } from '@/lib/i18n';
import { companyHref } from '@/lib/routes';
import { importIssueTitles } from '@/messages/codes';
import { label } from '@/messages/enums';

const POLL_MS = 1500;
const POLLING: ImportStatus[] = ['UPLOADED', 'VALIDATING', 'COMMITTING'];

const STEP_STYLE: Record<ImportStepState, string> = {
  PENDING: 'bg-slate-200 text-slate-600',
  ACTIVE: 'bg-brand-tint font-semibold text-brand-strong',
  DONE: 'bg-emerald-100 font-semibold text-emerald-800',
  FAILED: 'bg-red-100 font-semibold text-red-800',
};

const STATUS_TONE: Record<ImportStatus, Tone> = {
  UPLOADED: 'info',
  VALIDATING: 'info',
  VALIDATED: 'brand',
  REJECTED: 'danger',
  COMMITTING: 'info',
  COMMITTED: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
};

function Stage({
  tone,
  title,
  children,
}: {
  tone: 'brand' | 'info' | 'warning' | 'danger';
  title: string;
  children: ReactNode;
}) {
  const border = {
    brand: 'border-t-brand',
    info: 'border-t-cyan-700',
    warning: 'border-t-amber-700',
    danger: 'border-t-red-700',
  }[tone];
  return (
    <Card className={cn('flex max-w-3xl flex-col gap-3 border-t-4 px-6 py-5', border)}>
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </Card>
  );
}

function Uploader({ screen }: { screen: ImportScreen }) {
  const m = useMessages();
  const t = m.import;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const input = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const { maxFileBytes, maxRowsPerSheet } = screen.template;

  async function upload(file: File | undefined) {
    setLocalError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setLocalError(t.notXlsx);
      return;
    }
    if (file.size > maxFileBytes) {
      setLocalError(t.tooLarge(formatBytes(maxFileBytes)));
      return;
    }
    const body = new FormData();
    body.append('file', file);
    if (await write.run(`/api/v1/companies/${companyId}/imports`, body)) {
      toast.success(t.uploading);
    }
    if (input.current) input.current.value = '';
  }

  async function template() {
    setTemplateError(null);
    try {
      saveBlob(await download(screen.template.href));
    } catch (error) {
      setTemplateError(describeError(error).message);
    }
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-3">
      <WriteError error={write.error} />
      {localError && (
        <Alert tone="error" live>
          {localError}
        </Alert>
      )}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center gap-3 rounded-[10px] border-2 border-dashed px-5 py-8 text-center text-slate-600',
          dragging ? 'border-brand bg-brand-tint' : 'border-slate-300',
        )}
      >
        <div>{t.dropHint}</div>
        <div className="text-[13px]">{t.limits(formatBytes(maxFileBytes), formatInt(maxRowsPerSheet))}</div>
        <input
          ref={input}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          id="import-file"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <Button onClick={() => input.current?.click()} loading={write.pending} disabled={!screen.actions.upload}>
          {t.chooseFile}
        </Button>
      </div>
      {screen.actions.downloadTemplate && (
        <div>
          <button type="button" onClick={() => void template()} className="text-brand text-[13.5px] font-semibold">
            {t.downloadTemplate}
          </button>
          {templateError && (
            <span className="ml-3 text-[13px] text-red-700">
              {t.templateFailed}: {templateError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Issues({ screen }: { screen: ImportScreen }) {
  const t = useMessages().import;
  const current = screen.current;
  return (
    <>
      {screen.issuesBySheet.map((group) => (
        <Card key={group.sheet ?? '__file'} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div className="font-bold">{group.sheet ? t.sheet(group.sheet) : t.wholeFile}</div>
            <Badge tone="danger">{t.issueCount(group.count)}</Badge>
          </div>
          <TableWrap>
            <table className="eqty-table">
              <thead>
                <tr>
                  <th>{t.colRow}</th>
                  <th>{t.colCell}</th>
                  <th>{t.colColumn}</th>
                  <th>{t.colIssue}</th>
                </tr>
              </thead>
              <tbody>
                {group.issues.map((issue, i) => (
                  <tr key={`${issue.cell ?? ''}-${issue.code}-${i}`}>
                    <td className="font-mono text-[13px] whitespace-nowrap">{issue.row ?? '—'}</td>
                    <td className="font-mono text-[13px] whitespace-nowrap">{issue.cell ?? '—'}</td>
                    <td className="whitespace-nowrap">{issue.column ?? '—'}</td>
                    <td>
                      <div className="font-medium text-red-950">{importIssueTitles[issue.code] ?? issue.code}</div>
                      <div className="text-[13px] text-slate-600">{issue.message}</div>
                      <div className="font-mono text-[11.5px] text-slate-500">{issue.code}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      ))}
      {current && current.issueCount > current.issues.length && (
        <p className="text-[13px] text-slate-600">{t.firstIssues(current.issues.length, current.issueCount)}</p>
      )}
    </>
  );
}

function ImportView({ screen }: { screen: ImportScreen }) {
  const m = useMessages();
  const t = m.import;
  const { companyId } = useCompany();
  const toast = useToast();
  const write = useWrite(companyId);
  const current = screen.current;

  async function act(kind: 'commit' | 'cancel') {
    if (!current) return;
    if ((await write.run(`/api/v1/companies/${companyId}/imports/${current.id}:${kind}`, {})) && kind === 'cancel') {
      toast.success(t.cancelled);
    }
  }

  const summary = current?.summary;
  const summaryRows: [string, number][] = summary
    ? [
        [t.summary.stakeholders, summary.stakeholders],
        [t.summary.shareClasses, summary.shareClasses],
        [t.summary.holdings, summary.holdings],
        [t.summary.issuedShares, summary.issuedShares],
        [t.summary.poolShares, summary.poolShares],
        [t.summary.grants, summary.grants],
        [t.summary.grantedUnits, summary.grantedUnits],
      ]
    : [];

  let body: ReactNode;
  if (screen.state === 'COMPANY_NOT_EMPTY') {
    body = (
      <Stage tone="warning" title={t.notEmptyTitle}>
        <p className="text-sm text-slate-600">{t.notEmptyBody}</p>
      </Stage>
    );
  } else if (screen.state === 'COMPLETED') {
    body = (
      <Stage tone="brand" title={t.completedTitle(current?.cutOffDate ? formatDate(current.cutOffDate) : null)}>
        <p className="text-sm text-slate-600">{t.completedBody}</p>
        <div>
          <ButtonLink href={companyHref('capTable', companyId)} variant="secondary">
            {t.viewCapTable}
          </ButtonLink>
        </div>
      </Stage>
    );
  } else if (
    !current ||
    screen.state === 'READY' ||
    current.status === 'REJECTED' ||
    current.status === 'FAILED' ||
    current.status === 'CANCELLED'
  ) {
    body = (
      <>
        {current?.status === 'REJECTED' && (
          <>
            <Alert tone="error" live title={t.rejectedTitle(current.issueCount)}>
              {t.rejectedBody}
            </Alert>
            <Issues screen={screen} />
          </>
        )}
        {current?.status === 'FAILED' && (
          <Alert tone="error" live title={t.failedTitle}>
            {current.failure ? describeCode(current.failure.code) : t.failedBody}
          </Alert>
        )}
        <Stage tone="brand" title={current ? t.uploadFixed : t.readyTitle}>
          <Uploader screen={screen} />
        </Stage>
      </>
    );
  } else if (current.status === 'UPLOADED' || current.status === 'VALIDATING') {
    body = (
      <Stage
        tone="info"
        title={current.status === 'UPLOADED' ? t.uploadedTitle(current.fileName) : t.validatingTitle(current.fileName)}
      >
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-2 w-1/2 animate-pulse bg-cyan-700" />
        </div>
        <p className="text-[13px] text-slate-600">{t.validatingBody}</p>
      </Stage>
    );
  } else if (current.status === 'VALIDATED') {
    body = (
      <Stage tone="brand" title={t.validatedTitle(current.cutOffDate ? formatDate(current.cutOffDate) : '—')}>
        <WriteError error={write.error} />
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1.5 text-[13.5px]">
          {summaryRows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-600">{k}</dt>
              <dd className="text-right font-mono">{formatInt(v)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[12.5px] text-slate-500">{t.summaryNote}</p>
        <div className="flex flex-wrap gap-2.5">
          <Button onClick={() => void act('commit')} loading={write.pending} disabled={!screen.actions.confirm}>
            {t.confirm}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void act('cancel')}
            disabled={!screen.actions.cancel || write.pending}
          >
            {t.cancel}
          </Button>
        </div>
      </Stage>
    );
  } else if (current.status === 'COMMITTING') {
    body = (
      <Stage tone="info" title={t.committingTitle}>
        <p className="text-[13px] text-slate-600">{t.committingBody}</p>
      </Stage>
    );
  } else {
    body = (
      <Stage tone="brand" title={t.readyTitle}>
        <Uploader screen={screen} />
      </Stage>
    );
  }

  return (
    <>
      <ol aria-label={t.stepsLabel} className="flex flex-wrap gap-2 text-[13px]">
        {screen.steps.map((step) => (
          <li
            key={step.key}
            className={cn('rounded-full px-3 py-1.5', STEP_STYLE[step.state])}
            aria-current={step.state === 'ACTIVE' ? 'step' : undefined}
          >
            {t.steps[step.key]}
          </li>
        ))}
      </ol>
      {body}
      {screen.history.length > 0 && (
        <Card className="max-w-3xl overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5 font-bold">{t.historyTitle}</div>
          <TableWrap>
            <table className="eqty-table">
              <thead>
                <tr>
                  <th>{t.historyColFile}</th>
                  <th>{t.historyColTime}</th>
                  <th>{t.historyColStatus}</th>
                </tr>
              </thead>
              <tbody>
                {screen.history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.fileName}</td>
                    <td className="text-[13px] whitespace-nowrap text-slate-600">{formatDateTime(h.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      <Badge tone={STATUS_TONE[h.status]}>{label(m.enums.importStatus, h.status)}</Badge>
                      <span className="text-[13px] text-slate-600">{t.historyIssues(h.issueCount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      )}
    </>
  );
}

export function ImportPage() {
  const m = useMessages();
  const { companyId } = useCompany();
  const query = useApiQuery<ImportScreen>(['c', companyId, 'import'], `/bff/v1/companies/${companyId}/import`, {
    // The worker moves a file through UPLOADED → VALIDATING → …: ask again until a person is needed.
    refetchInterval: (screen) =>
      screen?.state === 'IN_PROGRESS' && screen.current && POLLING.includes(screen.current.status) ? POLL_MS : false,
  });
  return (
    <RoleGate route="import">
      <PageHeader title={m.import.title} subtitle={m.import.subtitle} />
      <Async query={query}>{(screen) => <ImportView screen={screen} />}</Async>
    </RoleGate>
  );
}
