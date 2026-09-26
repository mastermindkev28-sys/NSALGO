import type { DataResult } from "@/types/data";
import type {
  Bar,
  BreadthSnapshot,
  HistoryInterval,
  HistoryRange,
  MarketStatus,
  MoverKind,
  MoverRow,
  Quote,
  SectorPerformance,
  SymbolInfo,
} from "@/types/market";
import type { FlowFilter, OptionChain, OptionsFlowPrint } from "@/types/options";
import type { NewsArticle, NewsFilter } from "@/types/news";
import type {
  CongressionalDisclosure,
  DisclosureFilter,
  EarningsEvent,
  EconomicEvent,
  InsiderTransaction,
  InstitutionalActivity,
} from "@/types/disclosures";

/**
 * Provider contracts. The application depends only on these interfaces;
 * vendors plug in behind them (see providers/registry.ts). Every method
 * returns a DataResult carrying provenance, and must never throw for an
 * expected upstream failure.
 */
interface ProviderBase {
  readonly id: string;
  readonly label: string;
  /** Mock providers identify themselves so the UI can label simulated data. */
  readonly isMock: boolean;
  healthCheck(): Promise<ProviderHealth>;
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs: number | null;
  message: string;
  checkedAt: string;
}

export interface MarketDataProvider extends ProviderBase {
  getQuotes(symbols: string[]): Promise<DataResult<Quote[]>>;
  getHistory(symbol: string, range: HistoryRange, interval: HistoryInterval): Promise<DataResult<Bar[]>>;
  search(query: string, limit?: number): Promise<DataResult<SymbolInfo[]>>;
  getSymbol(symbol: string): Promise<DataResult<SymbolInfo>>;
  getMarketStatus(): Promise<DataResult<MarketStatus>>;
  getMovers(kind: MoverKind, limit?: number): Promise<DataResult<MoverRow[]>>;
  getSectors(): Promise<DataResult<SectorPerformance[]>>;
  getBreadth(): Promise<DataResult<BreadthSnapshot>>;
}

export interface OptionsDataProvider extends ProviderBase {
  getExpirations(symbol: string): Promise<DataResult<string[]>>;
  getChain(symbol: string, expiration?: string): Promise<DataResult<OptionChain>>;
  getFlow(filter: FlowFilter): Promise<DataResult<OptionsFlowPrint[]>>;
}

export interface NewsProvider extends ProviderBase {
  list(filter: NewsFilter): Promise<DataResult<NewsArticle[]>>;
  get(id: string): Promise<DataResult<NewsArticle>>;
}

export interface InsiderDataProvider extends ProviderBase {
  list(filter: DisclosureFilter): Promise<DataResult<InsiderTransaction[]>>;
}

export interface InstitutionalDataProvider extends ProviderBase {
  list(filter: DisclosureFilter): Promise<DataResult<InstitutionalActivity[]>>;
}

export interface CongressionalDisclosureProvider extends ProviderBase {
  list(filter: DisclosureFilter): Promise<DataResult<CongressionalDisclosure[]>>;
}

export interface EconomicCalendarProvider extends ProviderBase {
  list(range: { from: string; to: string }): Promise<DataResult<EconomicEvent[]>>;
  earnings(range: { from: string; to: string }, symbols?: string[]): Promise<DataResult<EarningsEvent[]>>;
}

export interface ProviderRegistry {
  market: MarketDataProvider;
  options: OptionsDataProvider;
  news: NewsProvider;
  insiders: InsiderDataProvider;
  institutional: InstitutionalDataProvider;
  congress: CongressionalDisclosureProvider;
  calendar: EconomicCalendarProvider;
}

export type ProviderSlot = keyof ProviderRegistry;
