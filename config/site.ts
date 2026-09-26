import type { SiteContent } from "@/types/domain";

export const SITE = {
  name: "NSALGO",
  product: "ATLAS",
  tagline: "Financial intelligence, organized.",
  description:
    "NSALGO brings market intelligence, AI-driven trade analysis, financial news, options activity and institutional signals into one intelligence platform.",
  // Explicit URL first; on Vercel fall back to the project's production domain.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  twitter: "@nsalgo",
  supportEmail: "support@nsalgo.com",
};

export const PUBLIC_NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/news", label: "News" },
  { href: "/atlas", label: "ATLAS" },
  { href: "/options-flow", label: "Options Flow" },
  { href: "/whales", label: "Whales" },
  { href: "/learn", label: "Learn" },
  { href: "/pricing", label: "Pricing" },
];

export const MEMBER_NAV = [
  { href: "/dashboard", label: "Overview", icon: "layout" },
  { href: "/dashboard/atlas", label: "Atlas", icon: "compass" },
  { href: "/dashboard/scanner", label: "Market Scanner", icon: "scan" },
  { href: "/dashboard/options", label: "Options", icon: "layers" },
  { href: "/dashboard/atlas/swing", label: "Swing", icon: "trend" },
  { href: "/dashboard/news", label: "News", icon: "news" },
  { href: "/dashboard/whales", label: "Whales", icon: "whale" },
  { href: "/dashboard/insiders", label: "Insiders", icon: "file" },
  { href: "/dashboard/congress", label: "Congress", icon: "landmark" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "calendar" },
  { href: "/dashboard/watchlists", label: "Watchlists", icon: "star" },
  { href: "/dashboard/learn", label: "Education", icon: "book" },
  { href: "/dashboard/account", label: "Account", icon: "user" },
] as const;

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/content", label: "Homepage" },
  { href: "/admin/news", label: "Commentary" },
  { href: "/admin/education", label: "Education CMS" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/atlas", label: "Atlas Config" },
  { href: "/admin/data-sources", label: "Data Sources" },
  { href: "/admin/system", label: "System Health" },
];

export const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { href: "/atlas", label: "ATLAS" },
      { href: "/markets", label: "Markets" },
      { href: "/news", label: "News" },
      { href: "/options-flow", label: "Options Flow" },
      { href: "/whales", label: "Whales & Disclosures" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/learn", label: "Learn" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

export const planFeatures = [
  "Live market intelligence",
  "ATLAS setups — day & swing",
  "Options intelligence & scanner",
  "Swing analysis",
  "Financial news terminal",
  "Whale & institutional activity",
  "Insider & congressional disclosures",
  "Education library",
  "Watchlists",
  "In-app alerts",
];

export const DEFAULT_SITE_CONTENT: Omit<SiteContent, "updatedAt"> = {
  heroEyebrow: "Market intelligence platform",
  heroHeadline: "See the market with direction.",
  heroSubhead:
    "NSALGO brings market intelligence, AI-driven trade analysis, financial news, options activity and institutional signals into one intelligence platform.",
  announcement: null,
  featuredTickers: ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "AMD", "IWM", "DIA", "VIX"],
};

export const DISCLAIMER_SHORT =
  "Informational and educational use only. Not investment advice. Market data may be delayed; AI-generated analysis can contain errors.";
