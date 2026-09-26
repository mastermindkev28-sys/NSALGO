import type { AssetClass } from "@/types/market";

/**
 * Static symbol reference data (names, exchanges, sectors). This is directory
 * information, not market data — prices always come from a configured provider.
 */
export interface UniverseEntry {
  symbol: string;
  name: string;
  exchange: string;
  assetClass: AssetClass;
  sector?: string;
  industry?: string;
  aliases?: string[];
  optionable?: boolean;
}

export const SECTOR_ETFS: { sector: string; etf: string }[] = [
  { sector: "Technology", etf: "XLK" },
  { sector: "Communication Services", etf: "XLC" },
  { sector: "Consumer Discretionary", etf: "XLY" },
  { sector: "Financials", etf: "XLF" },
  { sector: "Health Care", etf: "XLV" },
  { sector: "Industrials", etf: "XLI" },
  { sector: "Energy", etf: "XLE" },
  { sector: "Consumer Staples", etf: "XLP" },
  { sector: "Utilities", etf: "XLU" },
  { sector: "Materials", etf: "XLB" },
  { sector: "Real Estate", etf: "XLRE" },
];

export const UNIVERSE: UniverseEntry[] = [
  // Indices & index ETFs
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "NYSE Arca", assetClass: "etf", optionable: true, aliases: ["s&p", "sp500"] },
  { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "NASDAQ", assetClass: "etf", optionable: true, aliases: ["nasdaq 100"] },
  { symbol: "IWM", name: "iShares Russell 2000 ETF", exchange: "NYSE Arca", assetClass: "etf", optionable: true, aliases: ["russell"] },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial Average ETF", exchange: "NYSE Arca", assetClass: "etf", optionable: true, aliases: ["dow"] },
  { symbol: "SPX", name: "S&P 500 Index", exchange: "CBOE", assetClass: "index", aliases: ["s&p 500"] },
  { symbol: "NDX", name: "Nasdaq-100 Index", exchange: "NASDAQ", assetClass: "index" },
  { symbol: "COMP", name: "Nasdaq Composite", exchange: "NASDAQ", assetClass: "index", aliases: ["nasdaq"] },
  { symbol: "DJI", name: "Dow Jones Industrial Average", exchange: "DJ", assetClass: "index", aliases: ["dow jones"] },
  { symbol: "RUT", name: "Russell 2000 Index", exchange: "FTSE Russell", assetClass: "index" },
  { symbol: "VIX", name: "CBOE Volatility Index", exchange: "CBOE", assetClass: "index", aliases: ["volatility"] },
  // Futures
  { symbol: "ES", name: "E-mini S&P 500 Futures", exchange: "CME", assetClass: "future" },
  { symbol: "NQ", name: "E-mini Nasdaq-100 Futures", exchange: "CME", assetClass: "future" },
  { symbol: "YM", name: "E-mini Dow Futures", exchange: "CBOT", assetClass: "future" },
  { symbol: "RTY", name: "E-mini Russell 2000 Futures", exchange: "CME", assetClass: "future" },
  // Rates
  { symbol: "US2Y", name: "US 2-Year Treasury Yield", exchange: "UST", assetClass: "rate" },
  { symbol: "US10Y", name: "US 10-Year Treasury Yield", exchange: "UST", assetClass: "rate", aliases: ["10 year", "treasury"] },
  { symbol: "US30Y", name: "US 30-Year Treasury Yield", exchange: "UST", assetClass: "rate" },
  // Commodities
  { symbol: "GC", name: "Gold Futures", exchange: "COMEX", assetClass: "commodity", aliases: ["gold"] },
  { symbol: "SI", name: "Silver Futures", exchange: "COMEX", assetClass: "commodity", aliases: ["silver"] },
  { symbol: "CL", name: "WTI Crude Oil Futures", exchange: "NYMEX", assetClass: "commodity", aliases: ["oil", "crude"] },
  { symbol: "NG", name: "Natural Gas Futures", exchange: "NYMEX", assetClass: "commodity" },
  { symbol: "HG", name: "Copper Futures", exchange: "COMEX", assetClass: "commodity", aliases: ["copper"] },
  // FX
  { symbol: "DXY", name: "US Dollar Index", exchange: "ICE", assetClass: "fx", aliases: ["dollar"] },
  { symbol: "EURUSD", name: "Euro / US Dollar", exchange: "FX", assetClass: "fx" },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", exchange: "FX", assetClass: "fx" },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", exchange: "FX", assetClass: "fx" },
  // Crypto
  { symbol: "BTCUSD", name: "Bitcoin", exchange: "Crypto", assetClass: "crypto", aliases: ["bitcoin", "btc"] },
  { symbol: "ETHUSD", name: "Ethereum", exchange: "Crypto", assetClass: "crypto", aliases: ["ethereum", "eth"] },
  { symbol: "SOLUSD", name: "Solana", exchange: "Crypto", assetClass: "crypto", aliases: ["solana"] },
  // Sector ETFs
  { symbol: "XLK", name: "Technology Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf", optionable: true },
  { symbol: "XLC", name: "Communication Services Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLY", name: "Consumer Discretionary Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLF", name: "Financial Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf", optionable: true },
  { symbol: "XLV", name: "Health Care Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLI", name: "Industrial Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLE", name: "Energy Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf", optionable: true },
  { symbol: "XLP", name: "Consumer Staples Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLU", name: "Utilities Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLB", name: "Materials Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "XLRE", name: "Real Estate Select Sector SPDR", exchange: "NYSE Arca", assetClass: "etf" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", exchange: "NASDAQ", assetClass: "etf", optionable: true },
  // Equities
  { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Semiconductors", optionable: true, aliases: ["nvidia"] },
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Consumer Electronics", optionable: true, aliases: ["apple"] },
  { symbol: "MSFT", name: "Microsoft Corporation", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Software", optionable: true, aliases: ["microsoft"] },
  { symbol: "AMZN", name: "Amazon.com, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Consumer Discretionary", industry: "Internet Retail", optionable: true, aliases: ["amazon"] },
  { symbol: "GOOGL", name: "Alphabet Inc. Class A", exchange: "NASDAQ", assetClass: "equity", sector: "Communication Services", industry: "Internet Content", optionable: true, aliases: ["google", "alphabet"] },
  { symbol: "META", name: "Meta Platforms, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Communication Services", industry: "Internet Content", optionable: true, aliases: ["facebook", "meta"] },
  { symbol: "TSLA", name: "Tesla, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Consumer Discretionary", industry: "Automobiles", optionable: true, aliases: ["tesla"] },
  { symbol: "AMD", name: "Advanced Micro Devices, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Semiconductors", optionable: true, aliases: ["amd"] },
  { symbol: "AVGO", name: "Broadcom Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Semiconductors", optionable: true, aliases: ["broadcom"] },
  { symbol: "NFLX", name: "Netflix, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Communication Services", industry: "Entertainment", optionable: true, aliases: ["netflix"] },
  { symbol: "CRM", name: "Salesforce, Inc.", exchange: "NYSE", assetClass: "equity", sector: "Technology", industry: "Software", optionable: true, aliases: ["salesforce"] },
  { symbol: "ORCL", name: "Oracle Corporation", exchange: "NYSE", assetClass: "equity", sector: "Technology", industry: "Software", optionable: true, aliases: ["oracle"] },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Software", optionable: true, aliases: ["palantir"] },
  { symbol: "MU", name: "Micron Technology, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Semiconductors", optionable: true, aliases: ["micron"] },
  { symbol: "INTC", name: "Intel Corporation", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Semiconductors", optionable: true, aliases: ["intel"] },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", assetClass: "equity", sector: "Financials", industry: "Banks", optionable: true, aliases: ["jpmorgan", "chase"] },
  { symbol: "GS", name: "The Goldman Sachs Group, Inc.", exchange: "NYSE", assetClass: "equity", sector: "Financials", industry: "Capital Markets", optionable: true, aliases: ["goldman"] },
  { symbol: "BAC", name: "Bank of America Corporation", exchange: "NYSE", assetClass: "equity", sector: "Financials", industry: "Banks", optionable: true },
  { symbol: "V", name: "Visa Inc.", exchange: "NYSE", assetClass: "equity", sector: "Financials", industry: "Payments", optionable: true, aliases: ["visa"] },
  { symbol: "COIN", name: "Coinbase Global, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Financials", industry: "Capital Markets", optionable: true, aliases: ["coinbase"] },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated", exchange: "NYSE", assetClass: "equity", sector: "Health Care", industry: "Managed Care", optionable: true },
  { symbol: "LLY", name: "Eli Lilly and Company", exchange: "NYSE", assetClass: "equity", sector: "Health Care", industry: "Pharmaceuticals", optionable: true, aliases: ["lilly"] },
  { symbol: "XOM", name: "Exxon Mobil Corporation", exchange: "NYSE", assetClass: "equity", sector: "Energy", industry: "Oil & Gas", optionable: true, aliases: ["exxon"] },
  { symbol: "CVX", name: "Chevron Corporation", exchange: "NYSE", assetClass: "equity", sector: "Energy", industry: "Oil & Gas", optionable: true, aliases: ["chevron"] },
  { symbol: "CAT", name: "Caterpillar Inc.", exchange: "NYSE", assetClass: "equity", sector: "Industrials", industry: "Machinery", optionable: true },
  { symbol: "BA", name: "The Boeing Company", exchange: "NYSE", assetClass: "equity", sector: "Industrials", industry: "Aerospace", optionable: true, aliases: ["boeing"] },
  { symbol: "WMT", name: "Walmart Inc.", exchange: "NYSE", assetClass: "equity", sector: "Consumer Staples", industry: "Retail", optionable: true, aliases: ["walmart"] },
  { symbol: "COST", name: "Costco Wholesale Corporation", exchange: "NASDAQ", assetClass: "equity", sector: "Consumer Staples", industry: "Retail", optionable: true, aliases: ["costco"] },
  { symbol: "HD", name: "The Home Depot, Inc.", exchange: "NYSE", assetClass: "equity", sector: "Consumer Discretionary", industry: "Home Improvement", optionable: true },
  { symbol: "DIS", name: "The Walt Disney Company", exchange: "NYSE", assetClass: "equity", sector: "Communication Services", industry: "Entertainment", optionable: true, aliases: ["disney"] },
  { symbol: "UBER", name: "Uber Technologies, Inc.", exchange: "NYSE", assetClass: "equity", sector: "Industrials", industry: "Ground Transportation", optionable: true, aliases: ["uber"] },
  { symbol: "SHOP", name: "Shopify Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Software", optionable: true },
  { symbol: "SMCI", name: "Super Micro Computer, Inc.", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Hardware", optionable: true },
  { symbol: "ARM", name: "Arm Holdings plc", exchange: "NASDAQ", assetClass: "equity", sector: "Technology", industry: "Semiconductors", optionable: true },
];

const bySymbol = new Map(UNIVERSE.map((u) => [u.symbol, u]));

export function lookupSymbol(symbol: string): UniverseEntry | undefined {
  return bySymbol.get(symbol.toUpperCase());
}

export const EQUITY_UNIVERSE = UNIVERSE.filter((u) => u.assetClass === "equity").map((u) => u.symbol);

export const HERO_SYMBOLS = ["SPY", "QQQ", "NVDA", "AAPL", "TSLA", "AMD", "IWM", "DIA", "VIX"];

export const PULSE_SYMBOLS = [
  { symbol: "SPX", label: "S&P 500" },
  { symbol: "COMP", label: "Nasdaq" },
  { symbol: "DJI", label: "Dow" },
  { symbol: "RUT", label: "Russell 2000" },
  { symbol: "VIX", label: "VIX" },
  { symbol: "US10Y", label: "10Y Yield" },
  { symbol: "US2Y", label: "2Y Yield" },
  { symbol: "US30Y", label: "30Y Yield" },
  { symbol: "DXY", label: "DXY" },
  { symbol: "GC", label: "Gold" },
  { symbol: "CL", label: "Crude Oil" },
  { symbol: "BTCUSD", label: "Bitcoin" },
];

export const MARKET_GROUPS: { id: string; title: string; symbols: string[] }[] = [
  { id: "indices", title: "Major Indices", symbols: ["SPX", "COMP", "DJI", "RUT", "NDX"] },
  { id: "futures", title: "Futures", symbols: ["ES", "NQ", "YM", "RTY"] },
  { id: "rates", title: "Rates", symbols: ["US2Y", "US10Y", "US30Y"] },
  { id: "commodities", title: "Commodities", symbols: ["GC", "SI", "CL", "NG", "HG"] },
  { id: "fx", title: "FX", symbols: ["DXY", "EURUSD", "USDJPY", "GBPUSD"] },
  { id: "crypto", title: "Crypto", symbols: ["BTCUSD", "ETHUSD", "SOLUSD"] },
  { id: "volatility", title: "Volatility", symbols: ["VIX"] },
];
