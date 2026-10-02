import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerOutline' | 'ghost';

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-45';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong hover:text-white',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900',
  danger: 'bg-red-700 text-white hover:bg-red-800 hover:text-white',
  dangerOutline: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 hover:text-red-800',
  ghost: 'text-brand hover:bg-brand-tint hover:text-brand-strong',
};

export function buttonClass(variant: ButtonVariant = 'primary', className?: string): string {
  return cn(base, variants[variant], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading = false, className, children, disabled, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={buttonClass(variant, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, 'className' | 'children'>, Pick<AnchorHTMLAttributes<HTMLAnchorElement>, 'target' | 'rel'> {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ variant = 'primary', className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, className)} {...props}>
      {children}
    </Link>
  );
}

/** Small text button used inside table rows ("Sửa", "Thu hồi"). */
export function RowButton({ tone = 'brand', className, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'brand' | 'danger' }) {
  return (
    <button
      type={type}
      className={cn(
        'min-h-11 px-2 text-[13.5px] font-semibold disabled:opacity-45',
        tone === 'danger' ? 'text-red-700 hover:text-red-800' : 'text-brand hover:text-brand-strong',
        className,
      )}
      {...props}
    />
  );
}
