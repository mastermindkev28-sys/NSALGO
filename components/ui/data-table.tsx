"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "./states";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string | null;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
  /** Hide below the md breakpoint to keep mobile tables readable. */
  hideOnMobile?: boolean;
  width?: string;
}

/**
 * Sortable data table with sticky header. Windowed rendering kicks in for
 * large result sets so the browser only lays out visible rows.
 */
export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  initialSort,
  empty,
  maxHeight,
  dense,
  className,
  rowClassName,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  initialSort?: { key: string; dir: "asc" | "desc" };
  empty?: React.ReactNode;
  maxHeight?: number;
  dense?: boolean;
  className?: string;
  rowClassName?: (row: T) => string | undefined;
}) {
  const [sort, setSort] = React.useState(initialSort ?? null);
  const sorted = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
  }, [rows, columns, sort]);

  // Simple windowing for very large sets.
  const rowH = dense ? 34 : 42;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const windowed = maxHeight !== undefined && sorted.length > 150;
  const start = windowed ? Math.max(0, Math.floor(scrollTop / rowH) - 10) : 0;
  const end = windowed ? Math.min(sorted.length, start + Math.ceil(maxHeight / rowH) + 20) : sorted.length;
  const visible = sorted.slice(start, end);

  if (!rows.length) return <>{empty ?? <EmptyState title="No results" description="Adjust filters to broaden the result set." />}</>;

  const alignCls = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");

  return (
    <div
      ref={scrollRef}
      className={cn("relative w-full overflow-auto", className)}
      style={maxHeight ? { maxHeight } : undefined}
      onScroll={windowed ? (e) => setScrollTop((e.target as HTMLDivElement).scrollTop) : undefined}
    >
      <table className="w-full border-separate border-spacing-0 text-[12.5px]">
        <thead className="sticky top-0 z-10">
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn(
                    "h-8 whitespace-nowrap border-b border-line bg-graphite-900/95 px-3 font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-steel-500 backdrop-blur first:pl-4 last:pr-4",
                    alignCls(c.align),
                    c.hideOnMobile && "hidden md:table-cell",
                    c.headerClassName,
                  )}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      className={cn("inline-flex items-center gap-1 uppercase tracking-[0.12em] hover:text-steel-200", active && "text-steel-200")}
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: "desc" }))}
                    >
                      {c.header}
                      {active ? sort!.dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {windowed && start > 0 ? (
            <tr style={{ height: start * rowH }}>
              <td colSpan={columns.length} />
            </tr>
          ) : null}
          {visible.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === "Enter" ? onRowClick(row) : undefined) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn("group transition-colors", onRowClick && "cursor-pointer hover:bg-white/[0.025] focus-visible:bg-white/[0.04]", rowClassName?.(row))}
              style={{ height: rowH }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap border-b border-line/70 px-3 text-steel-100 first:pl-4 last:pr-4",
                    alignCls(c.align),
                    c.hideOnMobile && "hidden md:table-cell",
                    c.className,
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
          {windowed && end < sorted.length ? (
            <tr style={{ height: (sorted.length - end) * rowH }}>
              <td colSpan={columns.length} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
