"use client";

import { BarChart3, Compass, Pencil, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AlertButton } from "@/components/member/alert-button";
import { TradingViewChart } from "@/components/tradingview";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/ui/change";
import { Input, Modal } from "@/components/ui/controls";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/states";
import { useLiveQuotes } from "@/hooks/use-live-quotes";
import { fmtCompact, fmtPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DataResult } from "@/types/data";
import type { Watchlist } from "@/types/domain";
import type { Quote } from "@/types/market";
import { SymbolAutocomplete } from "./symbol-autocomplete";

async function api<T>(url: string, method: string, body?: unknown): Promise<T | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast.error(j.error?.message ?? "Request failed");
    return null;
  }
  return (j.data ?? true) as T;
}

export function WatchlistManager({ initial }: { initial: Watchlist[] }) {
  const [lists, setLists] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id ?? null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [chart, setChart] = useState<string | null>(null);
  const active = lists.find((l) => l.id === activeId) ?? null;
  const symbols = active?.items.map((i) => i.symbol) ?? [];
  const { data: quotes } = useLiveQuotes<DataResult<Quote[]> | null>(symbols, null);
  const [firstQuotes, setFirstQuotes] = useState<Record<string, Quote>>({});
  const qmap = new Map<string, Quote>(Object.entries(firstQuotes));
  if (quotes?.ok) for (const q of quotes.data) qmap.set(q.symbol, q);

  const refresh = async () => {
    const r = await api<Watchlist[]>("/api/watchlists", "GET");
    if (r) setLists(r);
  };
  const loadQuotesNow = async (syms: string[]) => {
    if (!syms.length) return;
    const r = await fetch(`/api/market/quote?symbols=${syms.join(",")}`).then((x) => x.json());
    if (r.ok) setFirstQuotes(Object.fromEntries((r.data as Quote[]).map((q) => [q.symbol, q])));
  };

  const create = async () => {
    if (!newName.trim()) return;
    const w = await api<Watchlist>("/api/watchlists", "POST", { name: newName.trim() });
    if (w) {
      setLists((l) => [...l, w]);
      setActiveId(w.id);
      setNewName("");
      toast.success(`Created ${w.name}`);
    }
  };
  const rename = async (id: string, name: string) => {
    const w = await api<Watchlist>(`/api/watchlists/${id}`, "PATCH", { name });
    if (w) setLists((l) => l.map((x) => (x.id === id ? w : x)));
    setRenaming(null);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this watchlist?")) return;
    if (await api(`/api/watchlists/${id}`, "DELETE")) {
      const rest = lists.filter((l) => l.id !== id);
      setLists(rest);
      setActiveId(rest[0]?.id ?? null);
    }
  };
  const add = async (symbol: string) => {
    if (!active) return;
    if (await api(`/api/watchlists/${active.id}/items`, "POST", { symbol })) {
      await refresh();
      void loadQuotesNow([...symbols, symbol]);
    }
  };
  const del = async (symbol: string) => {
    if (!active) return;
    if (await api(`/api/watchlists/${active.id}/items`, "DELETE", { symbol })) await refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="panel h-fit p-2">
        <ul className="space-y-px">
          {lists.map((l) => (
            <li key={l.id} className="group flex items-center">
              {renaming === l.id ? (
                <form
                  className="flex w-full gap-1 p-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void rename(l.id, String(new FormData(e.currentTarget).get("name") ?? ""));
                  }}
                >
                  <Input name="name" defaultValue={l.name} className="h-7 text-[12px]" autoFocus maxLength={40} />
                  <Button size="icon-sm" variant="ghost" type="button" onClick={() => setRenaming(null)} aria-label="Cancel"><X /></Button>
                </form>
              ) : (
                <>
                  <button onClick={() => setActiveId(l.id)} className={cn("flex flex-1 items-center justify-between rounded-sm px-3 py-2 text-left text-[13px]", l.id === activeId ? "bg-white/[0.07] text-chrome" : "text-steel-300 hover:bg-white/[0.03]")}>
                    {l.name}
                    <span className="num text-[11px] text-steel-500">{l.items.length}</span>
                  </button>
                  <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => setRenaming(l.id)} aria-label={`Rename ${l.name}`}><Pencil /></Button>
                  <Button size="icon-sm" variant="ghost" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => remove(l.id)} aria-label={`Delete ${l.name}`}><Trash2 /></Button>
                </>
              )}
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-1 border-t border-line p-1 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New watchlist" className="h-8 text-[12px]" maxLength={40} />
          <Button size="icon" variant="secondary" aria-label="Create watchlist" className="size-8"><Plus /></Button>
        </form>
        <p className="px-2 pt-2 text-[10.5px] text-steel-500">Suggested: Core · Day Trade · Swing · Earnings · High IV</p>
      </aside>
      <section className="panel min-w-0 overflow-hidden">
        {!active ? (
          <EmptyState title="Create your first watchlist" description="Organise symbols by strategy — Atlas and alerts work from them." />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h2 className="text-[15px] font-medium text-chrome">{active.name}</h2>
              <SymbolAutocomplete onSelect={(s) => add(s.symbol)} />
            </div>
            {active.items.length ? (
              <DataTable
                rows={active.items}
                rowKey={(i) => i.id}
                initialSort={{ key: "pct", dir: "desc" }}
                columns={[
                  { key: "sym", header: "Symbol", cell: (i) => <Link href={`/dashboard/symbol/${i.symbol}`} className="font-mono tracking-wider text-chrome hover:text-polar-300">{i.symbol}</Link>, sortValue: (i) => i.symbol },
                  { key: "name", header: "Name", cell: (i) => <span className="block max-w-[200px] truncate text-steel-400">{qmap.get(i.symbol)?.name ?? "—"}</span>, hideOnMobile: true },
                  { key: "last", header: "Last", align: "right", cell: (i) => <span className="num">{fmtPrice(qmap.get(i.symbol)?.last)}</span>, sortValue: (i) => qmap.get(i.symbol)?.last ?? null },
                  { key: "pct", header: "% Chg", align: "right", cell: (i) => <Change percent={qmap.get(i.symbol)?.changePercent ?? null} />, sortValue: (i) => qmap.get(i.symbol)?.changePercent ?? null },
                  { key: "vol", header: "Volume", align: "right", cell: (i) => <span className="num text-steel-300">{fmtCompact(qmap.get(i.symbol)?.volume)}</span>, sortValue: (i) => qmap.get(i.symbol)?.volume ?? null, hideOnMobile: true },
                  {
                    key: "act",
                    header: "",
                    align: "right",
                    cell: (i) => (
                      <span className="inline-flex items-center gap-1">
                        <Button asChild size="xs" variant="ghost" title="Open Atlas analysis">
                          <Link href={`/dashboard/symbol/${i.symbol}`}><Compass /> <span className="hidden xl:inline">Atlas</span></Link>
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setChart(i.symbol)} title="Open TradingView chart"><BarChart3 /> <span className="hidden xl:inline">Chart</span></Button>
                        <span className="hidden md:inline-flex [&_button]:h-7 [&_button]:px-2 [&_button]:text-xs"><AlertButton symbol={i.symbol} price={qmap.get(i.symbol)?.last} /></span>
                        <Button size="icon-sm" variant="ghost" onClick={() => del(i.symbol)} aria-label={`Remove ${i.symbol}`}><Trash2 /></Button>
                      </span>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState title="This watchlist is empty" description="Search above to add symbols." />
            )}
          </>
        )}
      </section>
      <Modal open={!!chart} onOpenChange={(o) => !o && setChart(null)} title={chart ? `${chart} · TradingView` : ""} className="max-w-5xl">
        {chart ? <TradingViewChart symbol={chart} height={520} /> : null}
      </Modal>
    </div>
  );
}
