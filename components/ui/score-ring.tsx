"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * ATLAS score ring. A ranking gauge (0–100) — the tooltip and caption make
 * clear it is not a probability. Colour follows grade bands on a single
 * polar-blue ramp; the number carries the value.
 */
export function ScoreRing({ value, size = 56, stroke = 3.5, className, label = true, coverage }: { value: number; size?: number; stroke?: number; className?: string; label?: boolean; coverage?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, shown)) / 100;
  const color = value >= 80 ? "#aecaff" : value >= 67 ? "#86acff" : value >= 52 ? "#5d8ef5" : "#59606c";
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }} role="img" aria-label={`ATLAS score ${value} of 100${coverage !== undefined ? `, ${Math.round(coverage * 100)}% data coverage` : ""}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff10" strokeWidth={stroke} />
        {coverage !== undefined && coverage < 1 ? (
          <circle cx={size / 2} cy={size / 2} r={r + stroke + 1} fill="none" stroke="#ffffff14" strokeWidth={1} strokeDasharray={`${c * coverage * ((r + stroke + 1) / r)} 999`} />
        ) : null}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      {label ? (
        <span className="num absolute font-medium text-chrome" style={{ fontSize: size * 0.3 }}>
          {Math.round(value)}
        </span>
      ) : null}
    </div>
  );
}
