import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './icons';

type AlertTone = 'info' | 'warning' | 'error' | 'success' | 'neutral';

const styles: Record<AlertTone, { box: string; icon: IconName }> = {
  info: { box: 'border-indigo-200 bg-indigo-50 text-indigo-950', icon: 'info' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: 'warning' },
  error: { box: 'border-red-200 bg-red-50 text-red-950', icon: 'x' },
  success: { box: 'border-emerald-200 bg-emerald-50 text-emerald-950', icon: 'check' },
  neutral: { box: 'border-slate-200 bg-slate-50 text-slate-700', icon: 'info' },
};

export function Alert({
  tone = 'neutral',
  title,
  children,
  actions,
  className,
  live = false,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Announce to screen readers when it appears (errors after a user action). */
  live?: boolean;
}) {
  const { box, icon } = styles[tone];
  return (
    <div
      role={live ? 'alert' : undefined}
      className={cn('flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm', box, className)}
    >
      <Icon name={icon} size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(Boolean(title) && 'mt-0.5')}>{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Quiet explanatory note under a form, as in the design ("Mỗi lần lưu được ghi vào lịch sử…"). */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600', className)}>{children}</div>
  );
}
