"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Tooltip } from "@/components/ui/controls";
import { DASH, fmtCompact, fmtDate, fmtInt, fmtIv, fmtPrice, fmtRange, fmtTimeET, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CongressionalDisclosure, InsiderTransaction, InstitutionalActivity } from "@/types/disclosures";
import type { OptionsFlowPrint } from "@/types/options";

const Ticker = ({ s }: { s: string | null }) =>
  s ? (
    <Link href={`/symbols/${s}`} onClick={(e) => e.stopPropagation()} className="font-mono text-[12px] tracking-wider text-chrome hover:text-polar-300">
      {s}
    </Link>
  ) : (
    <span className="text-steel-500">{DASH}</span>
  );

const Source = ({ url, label = "Filing" }: { url: string | null | undefined; label?: string }) =>
  url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-[11.5px] text-steel-300 hover:text-chrome">
      {label} <ExternalLink className="size-3" />
    </a>
  ) : (
    <Tooltip content="Simulated record — no source document.">
      <span className="text-[11.5px] text-steel-500">Simulated</span>
    </Tooltip>
  );

const Unavailable = ({ what }: { what: string }) => (
  <Tooltip content={`${what} not supplied by the data provider.`}>
    <span className="text-steel-500">n/a</span>
  </Tooltip>
);

/* ── Options flow ───────────────────────────────────────────────────────── */
export function FlowTable({ rows, maxHeight, compact }: { rows: OptionsFlowPrint[]; maxHeight?: number; compact?: boolean }) {
  const cols: Column<OptionsFlowPrint>[] = [
    { key: "time", header: "Time", cell: (r) => <span className="num text-steel-400">{fmtTimeET(r.timestamp).replace(" ET", "")}</span>, sortValue: (r) => r.timestamp },
    { key: "sym", header: "Ticker", cell: (r) => <Ticker s={r.underlying} />, sortValue: (r) => r.underlying },
    {
      key: "contract",
      header: "Contract",
      cell: (r) => (
        <span className="num">
          <span className={r.right === "call" ? "text-up" : "text-down"}>{r.right === "call" ? "C" : "P"}</span> {fmtPrice(r.strike, { decimals: r.strike % 1 ? 1 : 0 })}{" "}
          <span className="text-steel-500">{fmtDate(r.expiration)}</span>
        </span>
      ),
    },
    { key: "dte", header: "DTE", align: "right", cell: (r) => <span className="num">{r.dte}</span>, sortValue: (r) => r.dte, hideOnMobile: true },
    { key: "premium", header: "Premium", align: "right", cell: (r) => <span className="num text-chrome">{fmtCompact(r.premium, { currency: true })}</span>, sortValue: (r) => r.premium },
    { key: "size", header: "Contracts", align: "right", cell: (r) => <span className="num">{fmtInt(r.contracts)}</span>, sortValue: (r) => r.contracts, hideOnMobile: true },
    { key: "px", header: "Price", align: "right", cell: (r) => <span className="num">{fmtPrice(r.price)}</span>, hideOnMobile: true },
    { key: "spot", header: "Spot", align: "right", cell: (r) => <span className="num text-steel-300">{fmtPrice(r.spot)}</span>, hideOnMobile: true },
    { key: "voi", header: "Vol / OI", align: "right", cell: (r) => <span className="num text-steel-300">{r.volume !== null && r.openInterest ? `${fmtCompact(r.volume)} / ${fmtCompact(r.openInterest)}` : DASH}</span>, sortValue: (r) => (r.volume && r.openInterest ? r.volume / r.openInterest : null), hideOnMobile: true },
    { key: "iv", header: "IV", align: "right", cell: (r) => <span className="num">{fmtIv(r.impliedVolatility)}</span>, hideOnMobile: true },
    { key: "exec", header: "Type", cell: (r) => (r.execution ? <Badge size="sm" variant="outline">{r.execution}</Badge> : <Unavailable what="Execution type" />), hideOnMobile: compact },
    { key: "side", header: "Side", cell: (r) => (r.side ? <span className="font-mono text-[11px] uppercase text-steel-300">{r.side}</span> : <Unavailable what="Trade side" />), hideOnMobile: true },
    {
      key: "intent",
      header: "Open/Close",
      cell: (r) => (r.intent ? <span className="text-[11.5px] text-steel-300">{titleCase(r.intent)}</span> : <Unavailable what="Opening/closing status" />),
      hideOnMobile: true,
    },
    {
      key: "sent",
      header: "Read",
      cell: (r) =>
        r.sentiment === "bullish" ? (
          <Badge variant="up" size="sm">▲ Bullish</Badge>
        ) : r.sentiment === "bearish" ? (
          <Badge variant="down" size="sm">▼ Bearish</Badge>
        ) : r.sentiment === "neutral" ? (
          <Badge size="sm">Neutral</Badge>
        ) : (
          <Unavailable what="Directional read" />
        ),
    },
  ];
  return <DataTable rows={rows} columns={compact ? cols.filter((c) => ["time", "sym", "contract", "premium", "exec", "sent"].includes(c.key)) : cols} rowKey={(r) => r.id} initialSort={{ key: "time", dir: "desc" }} maxHeight={maxHeight} dense />;
}

/* ── Insider transactions ───────────────────────────────────────────────── */
const TX_VARIANT: Record<string, "up" | "down" | "neutral" | "outline"> = { purchase: "up", sale: "down", "option-exercise": "neutral", award: "outline", gift: "outline", "tax-withholding": "outline", other: "outline" };

export function InsiderTable({ rows, maxHeight, compact }: { rows: InsiderTransaction[]; maxHeight?: number; compact?: boolean }) {
  const cols: Column<InsiderTransaction>[] = [
    { key: "filed", header: "Filed", cell: (r) => <span className="num text-steel-400">{fmtDate(r.filingDate)}</span>, sortValue: (r) => r.filingDate },
    {
      key: "person",
      header: "Person",
      cell: (r) => (
        <div className="max-w-[220px]">
          <div className="truncate text-steel-50">{r.person}</div>
          <div className="truncate text-[11px] text-steel-500">{r.role}</div>
        </div>
      ),
      sortValue: (r) => r.person,
    },
    { key: "sym", header: "Ticker", cell: (r) => <Ticker s={r.ticker} />, sortValue: (r) => r.ticker },
    { key: "company", header: "Company", cell: (r) => <span className="block max-w-[180px] truncate text-steel-300">{r.company}</span>, hideOnMobile: true },
    {
      key: "type",
      header: "Transaction",
      cell: (r) => (
        <Badge size="sm" variant={TX_VARIANT[r.transactionType] ?? "outline"} title={r.transactionCode ? `SEC code ${r.transactionCode}` : undefined}>
          {titleCase(r.transactionType)}
          {r.transactionCode ? <span className="opacity-60">· {r.transactionCode}</span> : null}
        </Badge>
      ),
      sortValue: (r) => r.transactionType,
    },
    { key: "shares", header: "Shares", align: "right", cell: (r) => <span className="num">{fmtInt(r.shares)}</span>, sortValue: (r) => r.shares, hideOnMobile: true },
    { key: "price", header: "Price", align: "right", cell: (r) => <span className="num">{r.price ? fmtPrice(r.price, { currency: true }) : DASH}</span>, hideOnMobile: true },
    { key: "value", header: "≈ Value", align: "right", cell: (r) => <span className="num text-chrome">{fmtCompact(r.value, { currency: true })}</span>, sortValue: (r) => r.value },
    { key: "txd", header: "Trade date", cell: (r) => <span className="num text-steel-400">{fmtDate(r.transactionDate)}</span>, sortValue: (r) => r.transactionDate, hideOnMobile: true },
    { key: "src", header: "Source", cell: (r) => <Source url={r.filingUrl} label={`Form ${r.form}`} /> },
  ];
  return (
    <DataTable
      rows={rows}
      columns={compact ? cols.filter((c) => ["filed", "person", "sym", "type", "value"].includes(c.key)) : cols}
      rowKey={(r) => r.id}
      initialSort={{ key: "filed", dir: "desc" }}
      maxHeight={maxHeight}
      dense
    />
  );
}

/* ── Congressional disclosures ──────────────────────────────────────────── */
export function CongressTable({ rows, maxHeight, compact }: { rows: CongressionalDisclosure[]; maxHeight?: number; compact?: boolean }) {
  const cols: Column<CongressionalDisclosure>[] = [
    { key: "disc", header: "Disclosed", cell: (r) => <span className="num text-steel-400">{fmtDate(r.disclosureDate)}</span>, sortValue: (r) => r.disclosureDate },
    {
      key: "member",
      header: "Member",
      cell: (r) => (
        <div className="max-w-[220px]">
          <div className="truncate text-steel-50">{r.member}</div>
          <div className="truncate text-[11px] text-steel-500">
            {r.chamber === "house" ? "House" : "Senate"}
            {r.party ? ` · ${r.party}` : ""}
            {r.state ? `-${r.state}` : ""}
            {r.owner && r.owner !== "self" ? ` · ${titleCase(r.owner)}` : ""}
          </div>
        </div>
      ),
      sortValue: (r) => r.member,
    },
    { key: "sym", header: "Ticker", cell: (r) => <Ticker s={r.ticker} />, sortValue: (r) => r.ticker },
    { key: "issuer", header: "Issuer", cell: (r) => <span className="block max-w-[200px] truncate text-steel-300">{r.issuer}</span>, hideOnMobile: true },
    {
      key: "tx",
      header: "Transaction",
      cell: (r) => (
        <Badge size="sm" variant={r.transaction === "purchase" ? "up" : r.transaction === "exchange" ? "outline" : "down"}>
          {titleCase(r.transaction)}
        </Badge>
      ),
      sortValue: (r) => r.transaction,
    },
    {
      key: "range",
      header: "Value range",
      cell: (r) => (
        <span className="num text-steel-100" title={r.valueRange}>
          {compact ? fmtRange(r.valueMin, r.valueMax) : r.valueRange}
        </span>
      ),
      sortValue: (r) => r.valueMin,
    },
    { key: "txd", header: "Trade date", cell: (r) => <span className="num text-steel-400">{fmtDate(r.transactionDate)}</span>, sortValue: (r) => r.transactionDate, hideOnMobile: true },
    { key: "src", header: "Source", cell: (r) => <Source url={r.documentUrl} label="PTR" /> },
  ];
  return (
    <DataTable
      rows={rows}
      columns={compact ? cols.filter((c) => ["disc", "member", "sym", "tx", "range"].includes(c.key)) : cols}
      rowKey={(r) => r.id}
      initialSort={{ key: "disc", dir: "desc" }}
      maxHeight={maxHeight}
      dense
    />
  );
}

/* ── Institutional / whale activity ─────────────────────────────────────── */
const CAT_LABEL: Record<InstitutionalActivity["category"], string> = {
  "13f": "13F",
  "large-options": "Large options",
  "large-equity": "Large equity",
  "large-premium": "Large premium",
  "unusual-options-volume": "Unusual volume",
};

export function InstitutionalTable({ rows, maxHeight, compact }: { rows: InstitutionalActivity[]; maxHeight?: number; compact?: boolean }) {
  const cols: Column<InstitutionalActivity>[] = [
    { key: "date", header: "Date", cell: (r) => <span className="num text-steel-400">{fmtDate(r.date)}</span>, sortValue: (r) => r.date },
    { key: "cat", header: "Category", cell: (r) => <Badge size="sm" variant="outline">{CAT_LABEL[r.category]}</Badge>, sortValue: (r) => r.category },
    { key: "entity", header: "Entity", cell: (r) => <span className="block max-w-[220px] truncate text-steel-50">{r.entity}</span>, sortValue: (r) => r.entity },
    { key: "sym", header: "Ticker", cell: (r) => <Ticker s={r.ticker} />, sortValue: (r) => r.ticker },
    { key: "asset", header: "Asset", cell: (r) => <span className="text-steel-300">{r.asset}</span>, hideOnMobile: true },
    { key: "tx", header: "Transaction", cell: (r) => <span className={cn("block max-w-[260px] truncate text-steel-200")}>{r.transaction}</span> },
    { key: "val", header: "≈ Value", align: "right", cell: (r) => (r.estimatedValue === null ? <Unavailable what="Estimated value" /> : <span className="num text-chrome">{fmtCompact(r.estimatedValue, { currency: true })}</span>), sortValue: (r) => r.estimatedValue },
    { key: "src", header: "Source", cell: (r) => <Source url={r.sourceUrl} label={r.source === "sec-edgar" ? "EDGAR" : "Source"} />, hideOnMobile: true },
  ];
  return (
    <DataTable
      rows={rows}
      columns={compact ? cols.filter((c) => ["date", "cat", "entity", "sym", "val"].includes(c.key)) : cols}
      rowKey={(r) => r.id}
      initialSort={{ key: "date", dir: "desc" }}
      maxHeight={maxHeight}
      dense
    />
  );
}
