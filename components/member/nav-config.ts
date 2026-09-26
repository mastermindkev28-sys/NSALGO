import type { LucideIcon } from "lucide-react";
import { Bell, BookOpen, CalendarDays, Compass, CreditCard, FileText, Gauge, History, Landmark, Layers, LayoutDashboard, LineChart, Newspaper, ScanSearch, Sparkles, Star, TrendingUp, UserRound, Waves } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const MEMBER_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Intelligence",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
      { href: "/dashboard/atlas", label: "Atlas", icon: Compass, exact: true },
      { href: "/dashboard/atlas/day", label: "Day Trade", icon: Sparkles },
      { href: "/dashboard/atlas/swing", label: "Swing Trader", icon: TrendingUp },
      { href: "/dashboard/scanner", label: "Market Scanner", icon: ScanSearch },
      { href: "/dashboard/options", label: "Options Scanner", icon: Layers },
      { href: "/dashboard/atlas/history", label: "Atlas History", icon: History },
    ],
  },
  {
    title: "Markets",
    items: [
      { href: "/dashboard/markets", label: "Market Data", icon: LineChart },
      { href: "/dashboard/atlas/regime", label: "Market Regime", icon: Gauge },
      { href: "/dashboard/news", label: "News Feed", icon: Newspaper },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    title: "Flow & disclosures",
    items: [
      { href: "/dashboard/flow", label: "Options Flow", icon: Waves },
      { href: "/dashboard/whales", label: "Whale Activity", icon: Landmark },
      { href: "/dashboard/insiders", label: "Insiders", icon: FileText },
      { href: "/dashboard/congress", label: "Congress", icon: Landmark },
    ],
  },
  {
    title: "Personal",
    items: [
      { href: "/dashboard/watchlists", label: "Watchlists", icon: Star },
      { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
      { href: "/dashboard/learn", label: "Education", icon: BookOpen },
      { href: "/dashboard/account", label: "Account", icon: UserRound },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/atlas", label: "Atlas", icon: Compass },
  { href: "/dashboard/markets", label: "Markets", icon: LineChart },
  { href: "/dashboard/watchlists", label: "Watchlists", icon: Star },
];
