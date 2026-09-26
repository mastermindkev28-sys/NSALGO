"use client";

import { Command } from "cmdk";
import { BookOpen, Compass, CornerDownLeft, FileText, Hash, Lightbulb, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog as RDialog } from "radix-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Hit {
  type: "symbol" | "article" | "education" | "setup" | "person" | "concept";
  title: string;
  subtitle: string;
  href: string;
  meta?: string;
}
interface Results {
  query: string;
  groups: { type: Hit["type"]; label: string; hits: Hit[] }[];
}

const ICONS: Record<Hit["type"], React.ReactNode> = {
  symbol: <Hash />,
  setup: <Compass />,
  article: <FileText />,
  education: <BookOpen />,
  person: <User />,
  concept: <Lightbulb />,
};

const QUICK = ["NVDA", "SPY", "AAPL", "TSLA", "QQQ", "AMD"];

export function openSearch() {
  window.dispatchEvent(new Event("nsalgo:search"));
}

export function SearchTrigger({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={openSearch}
      className={cn(
        "group flex h-8 items-center gap-2 rounded-md border border-line bg-white/[0.02] px-2.5 text-[12.5px] text-steel-400 transition-colors hover:border-line-strong hover:text-steel-200",
        className,
      )}
      aria-label="Search symbols, news and research"
    >
      <Search className="size-3.5" />
      {!compact ? (
        <>
          <span className="hidden lg:inline">Search symbols, news, research</span>
          <span className="lg:hidden">Search</span>
          <kbd className="ml-3 hidden rounded-xs border border-line px-1 font-mono text-[10px] text-steel-500 lg:inline">⌘K</kbd>
        </>
      ) : null}
    </button>
  );
}

export function SearchCommand() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("nsalgo:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nsalgo:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!q.trim()) return;
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.current.signal });
        if (res.ok) setResults((await res.json()) as Results);
      } catch {
        /* keep previous results */
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => clearTimeout(t);
  }, [q]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      router.push(href);
    },
    [router],
  );

  return (
    <RDialog.Root open={open} onOpenChange={setOpen}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-[60] animate-fade-in bg-black/65 backdrop-blur-[2px]" />
        <RDialog.Content className="fixed left-1/2 top-[12vh] z-[60] w-[calc(100vw-1.5rem)] max-w-[640px] -translate-x-1/2 animate-fade-up focus:outline-none">
          <RDialog.Title className="sr-only">Search NSALGO</RDialog.Title>
          <RDialog.Description className="sr-only">Search tickers, companies, news, Atlas setups, people and market concepts.</RDialog.Description>
          <Command shouldFilter={false} className="panel overflow-hidden shadow-[var(--shadow-float)]" label="Global search">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-steel-400" />
              <Command.Input
                autoFocus
                value={q}
                onValueChange={setQ}
                placeholder="Search NVDA, Apple, “IV rank”, FOMC, a filer…"
                className="h-14 flex-1 bg-transparent text-[15px] text-chrome placeholder:text-steel-500 focus:outline-none"
              />
              {loading ? <span className="size-1.5 animate-pulse-soft rounded-full bg-polar-400" aria-hidden /> : null}
              <kbd className="rounded-xs border border-line px-1.5 py-0.5 font-mono text-[10px] text-steel-500">ESC</kbd>
            </div>
            <Command.List className="max-h-[56vh] overflow-y-auto p-2">
              {!q.trim() ? (
                <Command.Group heading="Quick symbols" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22em] [&_[cmdk-group-heading]]:text-steel-500">
                  {QUICK.map((s) => (
                    <Item key={s} value={`q-${s}`} onSelect={() => go(`/symbols/${s}`)} icon={<Hash />} title={s} subtitle="Overview, chart, news, options & Atlas" />
                  ))}
                </Command.Group>
              ) : (
                <>
                  <Command.Empty className="px-3 py-8 text-center text-[13px] text-steel-400">{loading ? "Searching…" : `No results for “${q}”.`}</Command.Empty>
                  {(q.trim() ? results : null)?.groups.map((g) => (
                    <Command.Group key={g.type} heading={g.label} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.22em] [&_[cmdk-group-heading]]:text-steel-500">
                      {g.hits.map((h, i) => (
                        <Item key={`${g.type}-${i}-${h.href}`} value={`${g.type}-${i}-${h.href}`} onSelect={() => go(h.href)} icon={ICONS[h.type]} title={h.title} subtitle={h.subtitle} meta={h.meta} />
                      ))}
                    </Command.Group>
                  ))}
                </>
              )}
            </Command.List>
            <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-steel-500">
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="size-3" /> open
              </span>
              <span>Tickers · companies · news · Atlas · people · concepts</span>
            </div>
          </Command>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

function Item({ value, onSelect, icon, title, subtitle, meta }: { value: string; onSelect: () => void; icon: React.ReactNode; title: string; subtitle: string; meta?: string }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-steel-200 data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-chrome"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-line bg-graphite-850 text-steel-400 [&_svg]:size-3.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium">{title}</span>
        <span className="block truncate text-[12px] text-steel-500">{subtitle}</span>
      </span>
      {meta ? <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-steel-500">{meta}</span> : null}
    </Command.Item>
  );
}
