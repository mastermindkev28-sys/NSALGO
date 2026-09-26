"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataSourceBadge } from "@/components/ui/data-source";
import { Segmented } from "@/components/ui/controls";
import { Skeleton, UnavailableState } from "@/components/ui/states";
import { fmtCompact, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { emaSeries, macdSeries, rsiSeries, smaSeries, vwapSeries } from "@/services/atlas/indicators";
import type { DataResult } from "@/types/data";
import type { Bar, HistoryInterval, HistoryRange } from "@/types/market";

/**
 * NSALGO chart panel — powered by TradingView Lightweight Charts™ and fed by
 * the NSALGO backend datafeed (/api/market/history), never by the charting
 * library itself. Candles, volume, moving averages, VWAP, RSI and MACD.
 */
const RANGES: { value: HistoryRange; label: string; interval: HistoryInterval }[] = [
  { value: "1D", label: "1D", interval: "5m" },
  { value: "5D", label: "5D", interval: "15m" },
  { value: "1M", label: "1M", interval: "1d" },
  { value: "3M", label: "3M", interval: "1d" },
  { value: "6M", label: "6M", interval: "1d" },
  { value: "1Y", label: "1Y", interval: "1d" },
  { value: "5Y", label: "5Y", interval: "1w" },
];

type Indicator = "sma20" | "sma50" | "ema9" | "vwap" | "volume" | "rsi" | "macd";

const COLORS = {
  up: "#31a57f",
  down: "#e5484d",
  sma20: "#5d8ef5",
  sma50: "#d95926",
  ema9: "#9085e9",
  vwap: "#c98500",
  grid: "#ffffff0a",
  text: "#737b88",
};

const LABELS: Record<Indicator, string> = { sma20: "SMA 20", sma50: "SMA 50", ema9: "EMA 9", vwap: "VWAP", volume: "Volume", rsi: "RSI 14", macd: "MACD" };

export function PriceChart({
  symbol,
  initialRange = "3M",
  height = 420,
  compact = false,
  defaultIndicators = ["sma20", "sma50", "volume"],
  className,
  levels,
}: {
  symbol: string;
  initialRange?: HistoryRange;
  height?: number;
  compact?: boolean;
  defaultIndicators?: Indicator[];
  className?: string;
  levels?: { price: number; label: string; kind: "entry" | "target" | "stop" }[];
}) {
  const [range, setRange] = useState<HistoryRange>(initialRange);
  const [ind, setInd] = useState<Set<Indicator>>(new Set(defaultIndicators));
  const [result, setResult] = useState<DataResult<Bar[]> | null>(null);
  const [hover, setHover] = useState<Bar | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const interval = RANGES.find((r) => r.value === range)!.interval;
  const intraday = interval.endsWith("m") || interval === "1h";

  useEffect(() => {
    const ctrl = new AbortController();
    setResult(null);
    fetch(`/api/market/history?symbol=${encodeURIComponent(symbol)}&range=${range}&interval=${interval}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<DataResult<Bar[]>>)
      .then(setResult)
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setResult({ ok: false, error: { code: "PROVIDER_UNAVAILABLE", message: "Chart data temporarily unavailable." } });
      });
    return () => ctrl.abort();
  }, [symbol, range, interval]);

  const bars = useMemo(() => (result?.ok ? result.data : []), [result]);

  useEffect(() => {
    if (!el.current || !bars.length) return;
    const chart = createChart(el.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: COLORS.text, fontFamily: "var(--font-geist-mono), ui-monospace, monospace", fontSize: 10.5, panes: { separatorColor: "#ffffff12", separatorHoverColor: "#ffffff22" }, attributionLogo: false },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderVisible: false, timeVisible: intraday, secondsVisible: false, rightOffset: 3 },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: "#ffffff30", labelBackgroundColor: "#232830" }, horzLine: { color: "#ffffff30", labelBackgroundColor: "#232830" } },
      handleScroll: !compact,
      handleScale: !compact,
    });
    chartRef.current = chart;
    const t = (b: Bar) => b.time as UTCTimestamp;
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderVisible: false,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      priceLineColor: "#ffffff40",
    });
    candles.setData(bars.map((b) => ({ time: t(b), open: b.open, high: b.high, low: b.low, close: b.close })));
    const closes = bars.map((b) => b.close);

    const line = (vals: (number | null)[], color: string, pane = 0, width: 1 | 2 = 2): ISeriesApi<"Line"> => {
      const s = chart.addSeries(LineSeries, { color, lineWidth: width, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false }, pane);
      s.setData(bars.map((b, i) => (vals[i] === null || vals[i] === undefined ? { time: t(b) } : { time: t(b), value: vals[i]! })));
      return s;
    };
    if (ind.has("sma20")) line(smaSeries(closes, 20), COLORS.sma20);
    if (ind.has("sma50")) line(smaSeries(closes, 50), COLORS.sma50);
    if (ind.has("ema9")) line(emaSeries(closes, 9), COLORS.ema9);
    if (ind.has("vwap") && intraday) {
      // VWAP anchors to each session.
      const out: (number | null)[] = [];
      let dayKey = "";
      let seg: Bar[] = [];
      bars.forEach((b) => {
        const k = new Date(b.time * 1000).toISOString().slice(0, 10);
        if (k !== dayKey) {
          dayKey = k;
          seg = [];
        }
        seg.push(b);
        out.push(vwapSeries(seg).at(-1) ?? null);
      });
      line(out, COLORS.vwap);
    }
    if (ind.has("volume")) {
      const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
      vol.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      vol.setData(bars.map((b, i) => ({ time: t(b), value: b.volume, color: (i > 0 ? b.close >= bars[i - 1]!.close : b.close >= b.open) ? "#31a57f40" : "#e5484d40" })));
    }
    let pane = 1;
    if (ind.has("rsi") && !compact) {
      const r = line(rsiSeries(closes, 14), COLORS.sma20, pane, 1);
      r.createPriceLine({ price: 70, color: "#ffffff26", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
      r.createPriceLine({ price: 30, color: "#ffffff26", lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: "" });
      pane++;
    }
    if (ind.has("macd") && !compact) {
      const m = macdSeries(closes);
      const h = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
      h.setData(bars.map((b, i) => (m[i]?.hist == null ? { time: t(b) } : { time: t(b), value: m[i]!.hist!, color: m[i]!.hist! >= 0 ? "#31a57f80" : "#e5484d80" })));
      line(m.map((x) => x.macd), COLORS.sma20, pane, 1);
      line(m.map((x) => x.signal), COLORS.sma50, pane, 1);
      pane++;
    }
    const panes = chart.panes();
    if (panes.length > 1) {
      panes[0]?.setStretchFactor(3);
      for (let i = 1; i < panes.length; i++) panes[i]?.setStretchFactor(1);
    }
    for (const lv of levels ?? []) {
      candles.createPriceLine({
        price: lv.price,
        color: lv.kind === "stop" ? "#e5484d" : lv.kind === "target" ? "#31a57f" : "#86acff",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: lv.label,
      });
    }
    chart.timeScale().fitContent();
    const byTime = new Map(bars.map((b) => [b.time, b]));
    chart.subscribeCrosshairMove((p) => setHover(p.time ? (byTime.get(p.time as number) ?? null) : null));
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [bars, ind, intraday, compact, levels]);

  const last = hover ?? bars[bars.length - 1] ?? null;
  const prev = last ? bars[bars.indexOf(last) - 1] : undefined;
  const chg = last && prev ? ((last.close - prev.close) / prev.close) * 100 : null;
  const toggle = (k: Indicator) =>
    setInd((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
        <div className="num flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-steel-400" aria-live="off">
          {last ? (
            <>
              <span>
                O <span className="text-steel-100">{fmtPrice(last.open)}</span>
              </span>
              <span>
                H <span className="text-steel-100">{fmtPrice(last.high)}</span>
              </span>
              <span>
                L <span className="text-steel-100">{fmtPrice(last.low)}</span>
              </span>
              <span>
                C <span className="text-steel-100">{fmtPrice(last.close)}</span>
              </span>
              {chg !== null ? <span className={chg >= 0 ? "text-up" : "text-down"}>{`${chg >= 0 ? "+" : "−"}${Math.abs(chg).toFixed(2)}%`}</span> : null}
              <span className="hidden sm:inline">
                Vol <span className="text-steel-100">{fmtCompact(last.volume)}</span>
              </span>
            </>
          ) : null}
        </div>
        <Segmented size="xs" value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r.value, label: r.label }))} />
      </div>
      {!compact ? (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-2.5">
          {(Object.keys(LABELS) as Indicator[]).map((k) => {
            const disabled = k === "vwap" && !intraday;
            const on = ind.has(k) && !disabled;
            const color = k === "sma20" ? COLORS.sma20 : k === "sma50" ? COLORS.sma50 : k === "ema9" ? COLORS.ema9 : k === "vwap" ? COLORS.vwap : undefined;
            return (
              <button
                key={k}
                type="button"
                disabled={disabled}
                onClick={() => toggle(k)}
                aria-pressed={on}
                title={disabled ? "VWAP applies to intraday ranges" : undefined}
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded-xs border px-2 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-35",
                  on ? "border-line-strong bg-white/[0.05] text-steel-100" : "border-line text-steel-500 hover:text-steel-300",
                )}
              >
                {color ? <span className="h-0.5 w-3 rounded-full" style={{ background: color, opacity: on ? 1 : 0.4 }} aria-hidden /> : null}
                {LABELS[k]}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="relative px-1 pb-1" style={{ height }}>
        {!result ? (
          <div className="absolute inset-3 flex flex-col justify-end gap-2">
            <Skeleton className="h-full w-full" />
          </div>
        ) : !result.ok ? (
          <UnavailableState error={result.error} label="Chart" className="h-full" />
        ) : !bars.length ? (
          <UnavailableState error={{ code: "NOT_FOUND", message: "No price history for this range." }} className="h-full" />
        ) : null}
        <div ref={el} className="h-full w-full" />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
        <DataSourceBadge meta={result?.ok ? result.meta : null} showTime={false} />
        <span className="text-[10.5px] text-steel-500">
          Charting by{" "}
          <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="hover:text-steel-300">
            TradingView Lightweight Charts™
          </a>
        </span>
      </div>
    </div>
  );
}
