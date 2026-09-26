"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import type { SymbolInfo } from "@/types/market";

/** Ticker search with autocomplete: symbol · company · exchange · asset type. */
export function SymbolAutocomplete({ onSelect, placeholder = "Add symbol — e.g. NVDA or Nvidia" }: { onSelect: (s: SymbolInfo) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SymbolInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const shown = q.trim() ? items : [];
  useEffect(() => {
    if (!q.trim()) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/market/search?q=${encodeURIComponent(q)}&limit=8`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((j) => {
          setItems(j.ok ? j.data : []);
          setActive(0);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const choose = (s: SymbolInfo) => {
    onSelect(s);
    setQ("");
    setItems([]);
    setOpen(false);
  };
  return (
    <div ref={box} className="relative w-full max-w-sm">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => shown.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(shown.length - 1, a + 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
          else if (e.key === "Enter" && shown[active]) {
            e.preventDefault();
            choose(shown[active]!);
          } else if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className="h-9 text-[13px]"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        maxLength={40}
      />
      {open && shown.length ? (
        <ul role="listbox" className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-line-strong bg-graphite-850 shadow-[var(--shadow-float)]">
          {shown.map((s, i) => (
            <li key={s.symbol} role="option" aria-selected={i === active}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => choose(s)} className={cn("flex w-full items-center gap-3 px-3 py-2 text-left text-[12.5px]", i === active && "bg-white/[0.06]")}>
                <span className="w-16 font-mono tracking-wider text-chrome">{s.symbol}</span>
                <span className="min-w-0 flex-1 truncate text-steel-300">{s.name}</span>
                <span className="shrink-0 font-mono text-[10px] uppercase text-steel-500">{s.exchange} · {s.assetClass}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
