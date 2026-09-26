"use client";

import { useState } from "react";
import { Segmented } from "@/components/ui/controls";
import { PriceChart } from "./price-chart";

/** Interactive chart panel with a symbol switcher. */
export function ChartSwitcher({ symbols, initial, height = 420 }: { symbols: string[]; initial?: string; height?: number }) {
  const [sym, setSym] = useState(initial ?? symbols[0]!);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="font-mono text-[13px] tracking-[0.1em] text-chrome">{sym}</span>
        <Segmented value={sym} onChange={setSym} options={symbols.map((s) => ({ value: s, label: s }))} size="xs" />
      </div>
      <PriceChart key={sym} symbol={sym} height={height} />
    </div>
  );
}
