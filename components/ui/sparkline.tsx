import { cn } from "@/lib/utils";

/** Minimal inline sparkline (server-renderable SVG). Single series → no legend; colour follows net direction. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
  baseline,
  area = true,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  baseline?: number;
  area?: boolean;
}) {
  if (values.length < 2) return <div style={{ width, height }} className={className} />;
  const min = Math.min(...values, baseline ?? Infinity);
  const max = Math.max(...values, baseline ?? -Infinity);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * (width - 2) + 1;
  const y = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const up = values[values.length - 1]! >= (baseline ?? values[0]!);
  const stroke = up ? "var(--color-up)" : "var(--color-down)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} aria-hidden>
      {baseline !== undefined ? <line x1={0} x2={width} y1={y(baseline)} y2={y(baseline)} stroke="#ffffff1a" strokeDasharray="2 3" strokeWidth={1} /> : null}
      {area ? <path d={`${d}L${x(values.length - 1)},${height}L${x(0)},${height}Z`} fill={stroke} opacity={0.08} /> : null}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
