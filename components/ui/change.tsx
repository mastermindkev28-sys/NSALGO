import { fmtChange, fmtPct, DASH } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Signed change. Direction is encoded three ways — sign, arrow glyph and
 * colour — so it never relies on red/green alone.
 */
export function Change({
  value,
  percent,
  className,
  showArrow = true,
  decimals = 2,
  size = "sm",
}: {
  value?: number | null;
  percent?: number | null;
  className?: string;
  showArrow?: boolean;
  decimals?: number;
  size?: "xs" | "sm" | "md";
}) {
  const basis = percent ?? value ?? null;
  const dir = basis === null || basis === undefined ? 0 : basis > 0 ? 1 : basis < 0 ? -1 : 0;
  const color = dir > 0 ? "text-up" : dir < 0 ? "text-down" : "text-steel-400";
  const arrow = dir > 0 ? "▲" : dir < 0 ? "▼" : "";
  const txt = [value !== undefined ? fmtChange(value, decimals) : null, percent !== undefined ? (value !== undefined ? `(${fmtPct(percent)})` : fmtPct(percent)) : null]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cn("num inline-flex items-center gap-1 whitespace-nowrap", color, size === "xs" ? "text-[11px]" : size === "md" ? "text-sm" : "text-[12.5px]", className)}>
      {showArrow && arrow ? (
        <span aria-hidden className="text-[0.7em]">
          {arrow}
        </span>
      ) : null}
      <span>{txt || DASH}</span>
      <span className="sr-only">{dir > 0 ? "up" : dir < 0 ? "down" : "unchanged"}</span>
    </span>
  );
}
