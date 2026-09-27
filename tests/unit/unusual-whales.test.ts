import { describe, expect, it } from "vitest";
import {
  mapCongressTrade,
  mapFlowAlert,
  mapInsiderTransaction,
  parseOcc,
  type UwFlowAlert,
  type UwInsiderTransaction,
} from "@/providers/unusualwhales";

const alert: UwFlowAlert = {
  id: "b202c313",
  ticker: "SPXW",
  type: "call",
  strike: "7805",
  expiry: "2026-09-28",
  start_time: 1790369680255,
  created_at: "2026-09-25T20:57:26.663485Z",
  total_premium: "102180",
  total_size: 250,
  total_ask_side_prem: "31250",
  total_bid_side_prem: "70930",
  price: "4.09",
  underlying_price: "7720",
  volume: 5512,
  open_interest: 1867,
  iv_end: "0.0788069103960752",
  trade_count: 21,
  has_sweep: false,
  all_opening_trades: false,
};

const insider: UwInsiderTransaction = {
  id: "2ac5e435",
  ticker: "SHOP",
  owner_name: "HOFFMEISTER JEFF",
  amount: -6152,
  price: "145.1600",
  transaction_code: "S",
  transaction_date: "2026-09-26",
  filing_date: "2026-09-25",
  formtype: "4",
  officer_title: null,
  is_officer: true,
  shares_owned_after: null,
  reporter_cik: "0001962732",
};

describe("unusual whales adapter", () => {
  it("parses OCC symbols", () => {
    expect(parseOcc("AAPL261016C00340000")).toEqual({ underlying: "AAPL", expiration: "2026-10-16", right: "call", strike: 340 });
    expect(parseOcc("O:SPXW260928P07805500")).toEqual({ underlying: "SPXW", expiration: "2026-09-28", right: "put", strike: 7805.5 });
    expect(parseOcc("nonsense")).toBeNull();
  });

  it("maps flow alerts with side and sentiment from premium split", () => {
    const p = mapFlowAlert(alert);
    expect(p).toMatchObject({ underlying: "SPXW", right: "call", strike: 7805, premium: 102180, contracts: 250, spot: 7720 });
    expect(p.side).toBe("bid"); // 69% of premium at the bid
    expect(p.sentiment).toBe("bearish"); // selling calls
    expect(p.execution).toBe("split");
    expect(p.intent).toBeNull();
    expect(p.timestamp).toBe(new Date(1790369680255).toISOString());

    const sweep = mapFlowAlert({ ...alert, type: "put", has_sweep: true, total_ask_side_prem: "90000", total_bid_side_prem: "12180", all_opening_trades: true });
    expect(sweep).toMatchObject({ execution: "sweep", side: "ask", sentiment: "bearish", intent: "opening" });

    const mid = mapFlowAlert({ ...alert, total_ask_side_prem: "50000", total_bid_side_prem: "52180", trade_count: 1 });
    expect(mid).toMatchObject({ side: "mid", sentiment: "neutral", execution: "block" });

    const unknown = mapFlowAlert({ ...alert, total_ask_side_prem: undefined, total_bid_side_prem: undefined });
    expect(unknown.side).toBeNull();
    expect(unknown.sentiment).toBeNull();
  });

  it("maps congressional trades to real disclosure sources", () => {
    const r = mapCongressTrade(
      {
        name: "Pete Sessions",
        reporter: "Hon. Pete Sessions",
        member_type: "house",
        ticker: "GOOGL",
        issuer: "undisclosed",
        notes: "Alphabet Inc. - Class A Common Stock (GOOGL) [ST]",
        txn_type: "Sell",
        amounts: "$15,001 - $50,000",
        transaction_date: "2026-09-14",
        filed_at_date: "2026-09-21",
      },
      0,
    );
    expect(r).toMatchObject({
      member: "Pete Sessions",
      chamber: "house",
      issuer: "Alphabet Inc. - Class A Common Stock (GOOGL)",
      ticker: "GOOGL",
      transaction: "sale",
      valueMin: 15001,
      valueMax: 50000,
      disclosureDate: "2026-09-21",
    });
    expect(r.documentUrl).toMatch(/^https:\/\/disclosures-clerk\.house\.gov/);
    expect(mapCongressTrade({ member_type: "senate", txn_type: "Buy" }, 1)).toMatchObject({ chamber: "senate", transaction: "purchase" });
  });

  it("maps Section 16 insider filings and skips Form 144 notices", () => {
    const r = mapInsiderTransaction(insider);
    expect(r).toMatchObject({ form: "4", transactionType: "sale", shares: 6152, price: 145.16, value: 893024, role: "Officer" });
    expect(r?.filingUrl).toContain("CIK=0001962732");
    expect(mapInsiderTransaction({ ...insider, formtype: "144" })).toBeNull();
    expect(mapInsiderTransaction({ ...insider, transaction_code: "J" })?.transactionType).toBe("other");
  });
});
