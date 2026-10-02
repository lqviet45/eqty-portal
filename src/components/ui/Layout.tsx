import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        {breadcrumb && <div className="text-[13px] text-slate-600">{breadcrumb}</div>}
        <h1 className="text-[26px] leading-tight font-bold">{title}</h1>
        {subtitle && <div className="text-[13.5px] text-slate-600">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-xl border border-slate-200 bg-white', className)}>{children}</div>;
}

/** A card with a titled header row, as most panels in the design. */
export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-4">
          {title && <h2 className="text-[17px] font-bold">{title}</h2>}
          {aside && <div className="text-[13px] text-slate-600">{aside}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

/** Horizontal scroll container for wide tables; the table itself uses the `eqty-table` class. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-x-auto', className)}>{children}</div>;
}

export function Kpi({ label, value, sub, children }: { label: ReactNode; value: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1 px-5 py-4">
      <div className="text-[13px] text-slate-600">{label}</div>
      <div className="font-mono text-[28px] leading-tight font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[12.5px] text-slate-600">{sub}</div>}
      {children}
    </Card>
  );
}

export function ProgressBar({ percent, label, tone = 'brand' }: { percent: number; label: string; tone?: 'brand' | 'teal' }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 overflow-hidden rounded-full bg-slate-200"
    >
      <div className={cn('h-full', tone === 'teal' ? 'bg-teal-400' : 'bg-brand')} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex h-11 rounded-lg bg-slate-200 p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3.5 text-[14.5px]',
            option.value === value ? 'bg-white font-semibold text-slate-900' : 'text-slate-600 hover:text-slate-900',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
