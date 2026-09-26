import Image from "next/image";
import emblemSrc from "@/assets/brand/emblem.png";
import lockupSrc from "@/assets/brand/lockup.png";
import wordmarkSrc from "@/assets/brand/wordmark.png";
import { cn } from "@/lib/utils";

/**
 * NSALGO brand marks. Masters live in assets/brand/source; the web files are
 * derived by scripts/brand-assets.mjs (chrome on transparent, for dark surfaces).
 * See docs/brand.md before changing anything here.
 */

/** The chrome north-star emblem (compass star with the S-twist and bezel ring). */
export function Emblem({ size = 28, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return <Image src={emblemSrc} alt="" aria-hidden width={size} height={size} priority={priority} className={cn("shrink-0 select-none", className)} draggable={false} />;
}

/** "NS ALGO" chrome wordmark. */
export function Wordmark({ height = 15, className, priority }: { height?: number; className?: string; priority?: boolean }) {
  const width = Math.round((wordmarkSrc.width / wordmarkSrc.height) * height);
  return <Image src={wordmarkSrc} alt="NSALGO" width={width} height={height} priority={priority} className={cn("select-none", className)} draggable={false} />;
}

/** Emblem stacked over the wordmark — for hero moments, auth and brand panels. */
export function Lockup({ width = 220, className, priority }: { width?: number; className?: string; priority?: boolean }) {
  const height = Math.round((lockupSrc.height / lockupSrc.width) * width);
  return <Image src={lockupSrc} alt="NSALGO" width={width} height={height} priority={priority} className={cn("select-none", className)} draggable={false} />;
}

/** Horizontal logo used in navigation: emblem + wordmark (or the emblem alone when compact). */
export function Logo({ className, compact = false, priority }: { className?: string; compact?: boolean; priority?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Emblem size={30} priority={priority} />
      {!compact ? <Wordmark height={14} priority={priority} /> : null}
    </span>
  );
}

export function AtlasWordmark({ className }: { className?: string }) {
  return <span className={cn("font-mono text-[11px] font-medium tracking-[0.42em] text-steel-200", className)}>ATLAS</span>;
}

/** Emblem with the brand's cold-blue glint and an optional floor reflection (after the master lockup). */
export function EmblemHero({ size = 160, reflection = false, className, priority }: { size?: number; reflection?: boolean; className?: string; priority?: boolean }) {
  return (
    <div className={cn("pointer-events-none relative inline-flex flex-col items-center", className)} aria-hidden>
      <span className="absolute left-1/2 top-1/2 size-[140%] -translate-x-1/2 -translate-y-[62%] rounded-full bg-[radial-gradient(circle,#5d8ef52e,transparent_60%)] blur-2xl" />
      <Emblem size={size} priority={priority} className="relative drop-shadow-[0_0_28px_#aecaff2e]" />
      {reflection ? (
        <div className="relative -mt-1 overflow-hidden" style={{ height: Math.round(size * 0.38) }}>
          <Emblem size={size} className="-scale-y-100 opacity-20 [mask-image:linear-gradient(to_top,black,transparent_40%)]" />
        </div>
      ) : null}
    </div>
  );
}
