"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TradingViewChart } from "./index";

/** Defers the TradingView advanced chart until requested (keeps pages fast). */
export function LazyTradingViewChart({ symbol, height = 520 }: { symbol: string; height?: number }) {
  const [on, setOn] = useState(false);
  if (!on) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center">
        <p className="text-[13px] text-steel-300">TradingView advanced chart with drawing tools and studies.</p>
        <p className="max-w-md text-[11.5px] text-steel-500">Rendered by TradingView using TradingView&apos;s own data feed. NSALGO analytics above use NSALGO&apos;s configured providers.</p>
        <Button variant="secondary" size="sm" onClick={() => setOn(true)}>
          Load TradingView chart
        </Button>
      </div>
    );
  }
  return <TradingViewChart symbol={symbol} height={height} />;
}
