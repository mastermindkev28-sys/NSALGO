import { cn } from "@/lib/utils";

/**
 * NSALGO north-star mark: a four-point compass star with an elongated
 * northern ray, set in chrome. Precision, direction, navigation.
 */
export function StarMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id="ns-chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#dfe4eb" />
          <stop offset="1" stopColor="#8e98a6" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="17.5" r="11" fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.75" />
      {/* diagonal hairline rays */}
      <path d="M9.6 11.1 16 17.5 22.4 11.1M9.6 23.9 16 17.5 22.4 23.9" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="0.6" fill="none" />
      {/* primary star: long north ray */}
      <path d="M16 1.5 17.55 15.95 26.5 17.5 17.55 19.05 16 28.5 14.45 19.05 5.5 17.5 14.45 15.95Z" fill="url(#ns-chrome)" />
      <circle cx="16" cy="17.5" r="1.05" fill="#07080a" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <StarMark />
      {!compact ? <span className="chrome-text text-[14.5px] font-semibold tracking-[0.34em]">NSALGO</span> : null}
    </span>
  );
}

export function AtlasWordmark({ className }: { className?: string }) {
  return <span className={cn("font-mono text-[11px] font-medium tracking-[0.42em] text-steel-200", className)}>ATLAS</span>;
}
