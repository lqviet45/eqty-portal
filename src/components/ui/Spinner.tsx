export function Spinner({ size = 20, label }: { size?: number; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} aria-label={label} className="inline-flex">
      <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
