"use client";

import { useMemo, useState } from "react";
import { fmtCompact, fmtDate, fmtPrice, fmtTimeET } from "@/lib/format";
import type { OptionsFlowPrint } from "@/types/options";

/**
 * Options-flow map: time of print (x) against strike moneyness vs spot (y);
 * mark area encodes premium. Colour = directional read where the provider
 * classified it; unclassified prints are grey. Shape is a secondary channel
 * (circle = call, diamond = put) so the chart never relies on colour alone.
 */
const W = 900;
const H = 300;
const PAD = { l: 44, r: 16, t: 14, b: 26 };
const COLORS = { bullish: "#31a57f", bearish: "#e5484d", neutral: "#737b88", unknown: "#59606c" };

export function FlowScatter({ prints }: { prints: OptionsFlowPrint[] }) {
  const [hover, setHover] = useState<OptionsFlowPrint | null>(null);
  const pts = useMemo(() => prints.filter((p) => p.spot && p.spot > 0).slice(0, 600), [prints]);
  const { xs, ys, rMax, tMin, tMax, mMin, mMax } = useMemo(() => {
    const ts = pts.map((p) => Date.parse(p.timestamp));
    const ms = pts.map((p) => ((p.strike - p.spot!) / p.spot!) * 100);
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts, tMin + 60_000);
    const mAbs = Math.min(25, Math.max(4, ...ms.map((m) => Math.abs(m))));
    return { xs: ts, ys: ms, rMax: Math.max(...pts.map((p) => p.premium), 1), tMin, tMax, mMin: -mAbs, mMax: mAbs };
  }, [pts]);
  if (!pts.length) return <div className="flex h-[300px] items-center justify-center text-[13px] text-steel-500">No prints to plot.</div>;
  const x = (t: number) => PAD.l + ((t - tMin) / (tMax - tMin)) * (W - PAD.l - PAD.r);
  const y = (m: number) => PAD.t + (1 - (Math.max(mMin, Math.min(mMax, m)) - mMin) / (mMax - mMin)) * (H - PAD.t - PAD.b);
  const r = (p: number) => 2.5 + Math.sqrt(p / rMax) * 13;
  const ticks = [mMin, mMin / 2, 0, mMax / 2, mMax];
  const tTicks = Array.from({ length: 5 }, (_, i) => tMin + ((tMax - tMin) * i) / 4);

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap items-center gap-4 px-1 text-[11px] text-steel-400">
        {(["bullish", "bearish", "neutral", "unknown"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: COLORS[k] }} aria-hidden />
            {k === "unknown" ? "Unclassified" : k[0]!.toUpperCase() + k.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="4" fill="none" stroke="#b1b7c1" />
          </svg>
          Call
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden>
            <rect x="1.5" y="1.5" width="7" height="7" transform="rotate(45 5 5)" fill="none" stroke="#b1b7c1" />
          </svg>
          Put
        </span>
        <span className="ml-auto text-steel-500">Mark area ∝ premium</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Options flow scatter: strike moneyness over time, sized by premium">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#ffffff26" : "#ffffff0d"} strokeWidth={1} />
            <text x={PAD.l - 8} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#737b88" fontFamily="var(--font-geist-mono)">
              {t > 0 ? "+" : ""}
              {t.toFixed(0)}%
            </text>
          </g>
        ))}
        {tTicks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={10} fill="#737b88" fontFamily="var(--font-geist-mono)">
            {fmtTimeET(new Date(t).toISOString()).replace(" ET", "")}
          </text>
        ))}
        <text x={PAD.l} y={PAD.t - 3} fontSize={9.5} fill="#59606c" fontFamily="var(--font-geist-mono)">
          STRIKE VS SPOT
        </text>
        {pts.map((p, i) => {
          const cx = x(xs[i]!);
          const cy = y(ys[i]!);
          const rr = r(p.premium);
          const color = COLORS[p.sentiment ?? "unknown"];
          const common = {
            fill: color,
            fillOpacity: hover?.id === p.id ? 0.9 : 0.35,
            stroke: "#0e1014",
            strokeWidth: 1.5,
            onMouseEnter: () => setHover(p),
            onMouseLeave: () => setHover(null),
            style: { cursor: "pointer", transition: "fill-opacity 120ms" },
          };
          return p.right === "call" ? (
            <circle key={p.id} cx={cx} cy={cy} r={rr} {...common} />
          ) : (
            <rect key={p.id} x={cx - rr * 0.85} y={cy - rr * 0.85} width={rr * 1.7} height={rr * 1.7} transform={`rotate(45 ${cx} ${cy})`} {...common} />
          );
        })}
      </svg>
      {hover ? (
        <div className="pointer-events-none absolute right-2 top-8 w-60 rounded-md border border-line-strong bg-graphite-850/95 p-3 text-[12px] shadow-[var(--shadow-float)] backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-mono tracking-wider text-chrome">{hover.underlying}</span>
            <span className="num text-steel-400">{fmtTimeET(hover.timestamp)}</span>
          </div>
          <div className="num mt-1 text-steel-100">
            {hover.right === "call" ? "Call" : "Put"} {fmtPrice(hover.strike)} · {fmtDate(hover.expiration)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-y-1 text-steel-400">
            <span>Premium</span>
            <span className="num text-right text-chrome">{fmtCompact(hover.premium, { currency: true })}</span>
            <span>Spot</span>
            <span className="num text-right text-steel-100">{fmtPrice(hover.spot)}</span>
            <span>Classification</span>
            <span className="text-right text-steel-100">{hover.execution ?? "n/a"}</span>
            <span>Read</span>
            <span className="text-right text-steel-100">{hover.sentiment ?? "unclassified"}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
