import { cn } from '@/lib/cn';

/** "Xem tại ngày": a native date input (value "YYYY-MM-DD") shaped like the design's inline picker. */
export function AsOfDateField({
  value,
  onChange,
  label,
  className,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
  max?: string;
}) {
  return (
    <label className={cn('flex h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13.5px] text-slate-600', className)}>
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 bg-transparent font-semibold text-slate-900"
      />
    </label>
  );
}
