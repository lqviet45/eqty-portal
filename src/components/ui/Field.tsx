import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const control =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[14.5px] font-normal text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500';
const invalidControl = 'border-red-500 focus-visible:outline-red-600';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
}

/** A label that wraps its control (so the whole label is clickable), with a hint and an error message below. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn('flex flex-col gap-1.5 text-[13px] font-semibold text-slate-700', className)}>
      {label}
      {children}
      {hint && !error && <span className="text-[12.5px] font-normal text-slate-500">{hint}</span>}
      {error && (
        <span role="alert" className="text-[12.5px] font-normal text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

interface ControlProps {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & ControlProps & { numeric?: boolean }>(function Input(
  { invalid, numeric, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, numeric && 'text-right font-mono', invalid && invalidControl, className)}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & ControlProps>(function Select(
  { invalid, className, ...props },
  ref,
) {
  return <select ref={ref} aria-invalid={invalid || undefined} className={cn(control, invalid && invalidControl, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps>(function Textarea(
  { invalid, className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(control, 'h-auto min-h-24 py-2.5', invalid && invalidControl, className)}
      {...props}
    />
  );
});

/** A read-only value shaped like an input (for values that cannot change, e.g. entity type). */
export function StaticValue({ label, children, mono }: { label: ReactNode; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 text-[13px] font-semibold text-slate-700">
      {label}
      <div className={cn('flex h-11 items-center rounded-lg bg-slate-100 px-3 text-[14.5px] font-normal text-slate-600', mono && 'font-mono')}>
        {children}
      </div>
    </div>
  );
}

export function Checkbox({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('flex min-h-11 items-center gap-2.5 text-[14.5px] text-slate-700', className)}>
      <input type="checkbox" className="size-[18px] accent-[var(--color-brand)]" {...props} />
      {label}
    </label>
  );
}

export function Radio({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn('flex min-h-11 items-center gap-2.5 text-[14.5px] text-slate-900', className)}>
      <input type="radio" className="size-[18px] accent-[var(--color-brand)]" {...props} />
      {label}
    </label>
  );
}
