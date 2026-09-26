"use client";

import { BellPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Modal, Select } from "@/components/ui/controls";

const KINDS = [
  { value: "price-above", label: "Price rises above", needs: true },
  { value: "price-below", label: "Price falls below", needs: true },
  { value: "atlas-score", label: "Atlas score reaches", needs: true },
  { value: "unusual-volume", label: "Unusual volume (× average)", needs: false },
  { value: "options-flow", label: "Large options print (min premium $)", needs: false },
  { value: "news", label: "New article mentions symbol", needs: false },
  { value: "insider", label: "New insider filing", needs: false },
] as const;

export function AlertButton({ symbol, price }: { symbol: string; price?: number | null }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["value"]>("price-above");
  const [threshold, setThreshold] = useState(price ? String(Math.round(price * 1.05 * 100) / 100) : "");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = threshold.trim() ? Number(threshold) : null;
    const res = await fetch("/api/alerts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, symbol, threshold: t, channel: "in-app" }) });
    const j = await res.json();
    if (res.ok) {
      toast.success("Alert created");
      setOpen(false);
    } else toast.error(j.error?.message ?? "Could not create alert");
  };
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={`Create alert · ${symbol}`}
      description="In-app notifications. Email and push delivery are planned extensions."
      trigger={
        <Button variant="secondary" size="md">
          <BellPlus /> Alert
        </Button>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="kind">Condition</Label>
          <Select id="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="threshold">Threshold {KINDS.find((k) => k.value === kind)?.needs ? "" : "(optional)"}</Label>
          <Input id="threshold" value={threshold} onChange={(e) => setThreshold(e.target.value)} inputMode="decimal" />
        </div>
        <Button variant="primary" className="w-full">Create alert</Button>
      </form>
    </Modal>
  );
}
