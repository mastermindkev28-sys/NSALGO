import { SegmentNav } from "@/components/ui/segment-nav";

export const ATLAS_TABS = [
  { href: "/dashboard/atlas", label: "Overview" },
  { href: "/dashboard/atlas/day", label: "Day Trade" },
  { href: "/dashboard/atlas/swing", label: "Swing" },
  { href: "/dashboard/scanner", label: "Scanner" },
  { href: "/dashboard/watchlists", label: "Watchlists" },
  { href: "/dashboard/atlas/regime", label: "Market Regime" },
  { href: "/dashboard/atlas/history", label: "History" },
];

export function AtlasSubnav() {
  return (
    <div className="border-b border-line px-4 sm:px-6 lg:px-8">
      <SegmentNav items={ATLAS_TABS} />
    </div>
  );
}
