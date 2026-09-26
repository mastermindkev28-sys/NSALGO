"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/controls";
import { DataSourceBadge } from "@/components/ui/data-source";
import { LoadingState, UnavailableState } from "@/components/ui/states";
import { fmtCompact, fmtIv, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DataResult } from "@/types/data";
import type { OptionChain, OptionContract } from "@/types/options";

/** Options chain: calls | strike | puts, ITM shading, liquidity-aware columns. */
export function OptionsChainView({ initial, initialSymbol }: { initial: DataResult<OptionChain>; initialSymbol: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [input, setInput] = useState(initialSymbol);
  const [exp, setExp] = useState<string | undefined>(initial.ok ? initial.data.expiration : undefined);
  const [data, setData] = useState<DataResult<OptionChain> | null>(initial);
  const [first, setFirst] = useState(true);

  useEffect(() => {
    if (first) {
      setFirst(false);
      return;
    }
    const ctrl = new AbortController();
    setData(null);
    fetch(`/api/options/chain?symbol=${encodeURIComponent(symbol)}${exp ? `&expiration=${exp}` : ""}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: DataResult<OptionChain> & { error?: { message: string } }) => setData(j.ok ? j : { ok: false, error: j.error ?? { code: "INTERNAL", message: "Chain unavailable" } } as DataResult<OptionChain>))
      .catch(() => undefined);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- first render uses server data
  }, [symbol, exp]);

  const chain = data?.ok ? data.data : null;
  const strikes = chain ? [...new Set([...chain.calls, ...chain.puts].map((c) => c.strike))].sort((a, b) => a - b) : [];
  const byStrike = (list: OptionContract[]) => new Map(list.map((c) => [c.strike, c]));
  const calls = chain ? byStrike(chain.calls) : new Map();
  const puts = chain ? byStrike(chain.puts) : new Map();
  const spot = chain?.underlyingPrice ?? null;

  const Side = ({ c, itm, align }: { c?: OptionContract; itm: boolean; align: "left" | "right" }) => (
    <>
      {["bid", "ask", "volume", "openInterest", "impliedVolatility", "delta"].map((k) => {
        const v = c?.[k as keyof OptionContract] as number | null | undefined;
        const txt = v === null || v === undefined ? "—" : k === "impliedVolatility" ? fmtIv(v) : k === "delta" ? v.toFixed(2) : k === "volume" || k === "openInterest" ? fmtCompact(v) : fmtPrice(v, { decimals: 2 });
        return (
          <td key={k} className={cn("num px-2 py-1.5 text-right", itm ? "bg-polar-500/[0.06]" : "", align === "left" ? "" : "")}>
            {txt}
          </td>
        );
      })}
    </>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setExp(undefined);
            setSymbol(input.trim().toUpperCase());
          }}
          className="flex gap-2"
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} className="h-8 w-28 text-[12px] uppercase" aria-label="Underlying symbol" maxLength={8} />
          <Button size="sm" variant="secondary">Load</Button>
        </form>
        {chain ? (
          <Select value={chain.expiration} onChange={(e) => setExp(e.target.value)} className="w-44 [&_select]:h-8 [&_select]:text-[12px]" aria-label="Expiration">
            {chain.expirations.slice(0, 16).map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </Select>
        ) : null}
        {chain ? (
          <span className="ml-auto flex flex-wrap items-center gap-3 text-[12px] text-steel-400">
            <span>Spot <span className="num text-steel-100">{fmtPrice(spot)}</span></span>
            <span>ATM IV <span className="num text-steel-100">{fmtIv(chain.atmIv)}</span></span>
            <span>IV rank <span className="num text-steel-100">{chain.ivRank ?? "n/a"}</span></span>
            <DataSourceBadge meta={data?.ok ? data.meta : null} showTime={false} />
          </span>
        ) : null}
      </div>
      {!data ? (
        <LoadingState rows={12} />
      ) : !data.ok ? (
        <UnavailableState error={data.error} label="Options chain" />
      ) : (
        <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-[12px]">
            <thead className="sticky top-0 z-10 bg-graphite-900">
              <tr className="font-mono text-[10px] uppercase tracking-[0.12em] text-steel-500">
                <th colSpan={6} className="border-b border-line py-2 text-center font-normal text-up">Calls</th>
                <th className="border-b border-line py-2 font-normal">Strike</th>
                <th colSpan={6} className="border-b border-line py-2 text-center font-normal text-down">Puts</th>
              </tr>
              <tr className="font-mono text-[10px] uppercase tracking-[0.1em] text-steel-500">
                {["Bid", "Ask", "Vol", "OI", "IV", "Δ"].map((h) => <th key={`c${h}`} className="border-b border-line px-2 py-1.5 text-right font-normal">{h}</th>)}
                <th className="border-b border-line px-2 py-1.5 font-normal" />
                {["Bid", "Ask", "Vol", "OI", "IV", "Δ"].map((h) => <th key={`p${h}`} className="border-b border-line px-2 py-1.5 text-right font-normal">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {strikes.map((k) => {
                const atmRow = spot !== null && strikes.reduce((b, x) => (Math.abs(x - spot) < Math.abs(b - spot) ? x : b), strikes[0]!) === k;
                return (
                  <tr key={k} className={cn("border-b border-line/50 hover:bg-white/[0.02]", atmRow && "outline outline-1 -outline-offset-1 outline-polar-500/40")}>
                    <Side c={calls.get(k)} itm={spot !== null && k < spot} align="left" />
                    <td className="num border-x border-line bg-graphite-850 px-3 py-1.5 text-center font-medium text-chrome">{fmtPrice(k)}</td>
                    <Side c={puts.get(k)} itm={spot !== null && k > spot} align="right" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
