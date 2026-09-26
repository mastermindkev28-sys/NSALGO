"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * TradingView widgets. These embeds render TradingView's own data inside
 * their iframe and are labelled as such. NSALGO's own prices, Atlas and
 * analytics always come from the configured NSALGO providers.
 */
const BASE = "https://s3.tradingview.com/external-embedding";

function useWidget(script: string, config: Record<string, unknown>) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(config);
  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    host.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget h-full w-full";
    host.appendChild(widget);
    const s = document.createElement("script");
    s.src = `${BASE}/${script}`;
    s.async = true;
    s.type = "text/javascript";
    s.text = key;
    s.onerror = () => setFailed(true);
    host.appendChild(s);
    const t = setTimeout(() => {
      if (!host.querySelector("iframe")) setFailed(true);
    }, 12_000);
    return () => {
      clearTimeout(t);
      host.innerHTML = "";
    };
  }, [script, key]);
  return { ref, failed };
}

function Frame({ children, failed, className, height, label }: { children: React.ReactNode; failed: boolean; className?: string; height: number | string; label: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ height }}>
      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-[13px] text-steel-200">TradingView unavailable</p>
          <p className="max-w-xs text-[12px] text-steel-500">The {label} embed could not be loaded (network or content blocker). NSALGO data elsewhere on this page is unaffected.</p>
        </div>
      ) : null}
      {children}
      <div className="pointer-events-none absolute bottom-1 right-2 text-[10px] text-steel-500">Data & chart by TradingView</div>
    </div>
  );
}

const common = { colorTheme: "dark", isTransparent: true, locale: "en" };

export function TradingViewChart({ symbol, height = 520, interval = "D", className }: { symbol: string; height?: number; interval?: string; className?: string }) {
  const { ref, failed } = useWidget("embed-widget-advanced-chart.js", {
    ...common,
    autosize: true,
    symbol,
    interval,
    timezone: "America/New_York",
    theme: "dark",
    style: "1",
    backgroundColor: "rgba(0,0,0,0)",
    gridColor: "rgba(255,255,255,0.04)",
    hide_side_toolbar: false,
    allow_symbol_change: false,
    studies: ["STD;VWAP", "STD;RSI"],
    support_host: "https://www.tradingview.com",
  });
  return (
    <Frame failed={failed} className={className} height={height} label="advanced chart">
      <div ref={ref} className="tradingview-widget-container h-full w-full" />
    </Frame>
  );
}

export function TradingViewMiniChart({ symbol, height = 180, className }: { symbol: string; height?: number; className?: string }) {
  const { ref, failed } = useWidget("embed-widget-mini-symbol-overview.js", { ...common, symbol, width: "100%", height: "100%", dateRange: "1M", trendLineColor: "rgba(93,142,245,1)", underLineColor: "rgba(93,142,245,0.08)" });
  return (
    <Frame failed={failed} className={className} height={height} label="mini chart">
      <div ref={ref} className="tradingview-widget-container h-full w-full" />
    </Frame>
  );
}

export function TradingViewMarketOverview({ height = 460, className }: { height?: number; className?: string }) {
  const { ref, failed } = useWidget("embed-widget-market-overview.js", {
    ...common,
    width: "100%",
    height: "100%",
    dateRange: "1D",
    showChart: true,
    plotLineColorGrowing: "rgba(49,165,127,1)",
    plotLineColorFalling: "rgba(229,72,77,1)",
    tabs: [
      { title: "Indices", symbols: [{ s: "FOREXCOM:SPXUSD", d: "S&P 500" }, { s: "FOREXCOM:NSXUSD", d: "Nasdaq 100" }, { s: "FOREXCOM:DJI", d: "Dow 30" }] },
      { title: "Futures", symbols: [{ s: "CME_MINI:ES1!", d: "S&P 500" }, { s: "CME_MINI:NQ1!", d: "Nasdaq 100" }, { s: "COMEX:GC1!", d: "Gold" }, { s: "NYMEX:CL1!", d: "Crude Oil" }] },
    ],
  });
  return (
    <Frame failed={failed} className={className} height={height} label="market overview">
      <div ref={ref} className="tradingview-widget-container h-full w-full" />
    </Frame>
  );
}

export function TradingViewEconomicCalendar({ height = 520, className }: { height?: number; className?: string }) {
  const { ref, failed } = useWidget("embed-widget-events.js", { ...common, width: "100%", height: "100%", importanceFilter: "0,1", countryFilter: "us" });
  return (
    <Frame failed={failed} className={className} height={height} label="economic calendar">
      <div ref={ref} className="tradingview-widget-container h-full w-full" />
    </Frame>
  );
}
