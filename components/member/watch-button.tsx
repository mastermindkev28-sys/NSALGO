"use client";

import { Check, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownTrigger } from "@/components/ui/controls";
import type { Watchlist } from "@/types/domain";

/** Adds a symbol to one of the member's watchlists (persisted server-side). */
export function WatchButton({ symbol }: { symbol: string }) {
  const [lists, setLists] = useState<Watchlist[] | null>(null);
  const load = () =>
    fetch("/api/watchlists")
      .then((r) => r.json())
      .then((j) => j.ok && setLists(j.data))
      .catch(() => setLists([]));
  useEffect(() => {
    void load();
  }, []);
  const inAny = lists?.some((l) => l.items.some((i) => i.symbol === symbol));
  const add = async (w: Watchlist) => {
    const has = w.items.some((i) => i.symbol === symbol);
    const res = await fetch(`/api/watchlists/${w.id}/items`, { method: has ? "DELETE" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) });
    if (res.ok) toast.success(has ? `Removed ${symbol} from ${w.name}` : `Added ${symbol} to ${w.name}`);
    else toast.error((await res.json()).error?.message ?? "Could not update watchlist");
    void load();
  };
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button variant="secondary" size="md">
          <Star className={inAny ? "fill-current text-warn" : undefined} /> {inAny ? "Watching" : "Watch"}
        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Watchlists</DropdownLabel>
        {lists?.length ? (
          lists.map((w) => (
            <DropdownItem key={w.id} onSelect={() => add(w)}>
              <span className="w-4">{w.items.some((i) => i.symbol === symbol) ? <Check /> : null}</span>
              {w.name}
            </DropdownItem>
          ))
        ) : (
          <DropdownItem onSelect={() => (window.location.href = "/dashboard/watchlists")}>Create a watchlist</DropdownItem>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
