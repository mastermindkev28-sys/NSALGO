export type InsiderTransactionType =
  | "purchase"
  | "sale"
  | "option-exercise"
  | "award"
  | "gift"
  | "tax-withholding"
  | "other";

/** Section 16 filings (SEC Forms 3, 4, 5). */
export interface InsiderTransaction {
  id: string;
  person: string;
  company: string;
  ticker: string;
  role: string;
  form: "3" | "4" | "5" | "4/A";
  transactionType: InsiderTransactionType;
  transactionCode: string | null; // raw SEC code (P, S, M, A, G, F…)
  shares: number | null;
  price: number | null;
  value: number | null;
  sharesOwnedAfter: number | null;
  transactionDate: string;
  filingDate: string;
  filingUrl: string;
  source: string;
}

export type InstitutionalCategory =
  | "13f"
  | "large-options"
  | "large-equity"
  | "large-premium"
  | "unusual-options-volume";

export interface InstitutionalActivity {
  id: string;
  category: InstitutionalCategory;
  entity: string;
  ticker: string | null;
  asset: string;
  transaction: string;
  estimatedValue: number | null;
  shares: number | null;
  changePercent: number | null;
  date: string;
  source: string;
  sourceUrl: string | null;
  sourceTimestamp: string;
}

export type Chamber = "house" | "senate";

export interface CongressionalDisclosure {
  id: string;
  member: string;
  chamber: Chamber;
  party: "D" | "R" | "I" | null;
  state: string | null;
  owner: "self" | "spouse" | "joint" | "dependent" | null;
  issuer: string;
  ticker: string | null;
  transaction: "purchase" | "sale" | "partial-sale" | "exchange";
  /** Disclosures are filed in statutory ranges, never exact amounts. */
  valueRange: string;
  valueMin: number | null;
  valueMax: number | null;
  transactionDate: string;
  disclosureDate: string;
  documentUrl: string;
  source: string;
}

export interface DisclosureFilter {
  ticker?: string;
  person?: string;
  chamber?: Chamber;
  transaction?: string;
  since?: string;
  limit?: number;
  category?: InstitutionalCategory;
}

export type EventImportance = "high" | "medium" | "low";

export interface EconomicEvent {
  id: string;
  datetime: string; // ISO
  country: string;
  event: string;
  category:
    | "inflation"
    | "employment"
    | "growth"
    | "central-bank"
    | "consumer"
    | "manufacturing"
    | "housing"
    | "treasury"
    | "other";
  importance: EventImportance;
  /** null means the provider has not published a value — never estimated. */
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  source: string;
}

export interface EarningsEvent {
  symbol: string;
  company: string;
  date: string;
  time: "bmo" | "amc" | "unknown";
  epsEstimate: number | null;
  source: string;
}
