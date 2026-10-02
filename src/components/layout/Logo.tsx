import { cn } from '@/lib/cn';

export function Logo({
  className,
  tone = 'dark',
  size = 32,
}: {
  className?: string;
  tone?: 'dark' | 'light';
  size?: number;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="bg-accent flex items-center justify-center rounded-lg font-bold text-slate-900"
        style={{ width: size, height: size }}
      >
        e
      </span>
      <span className={cn('text-lg font-bold tracking-tight', tone === 'light' ? 'text-white' : 'text-slate-900')}>
        eqty
      </span>
    </span>
  );
}
