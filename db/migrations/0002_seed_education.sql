-- Launch education library (generated from db/seed/education.ts).
-- Idempotent: existing rows with the same slug are left untouched so CMS edits survive re-runs.

insert into educational_categories (slug, name, description, position) values
  ('options', 'Options', 'Contracts, pricing, greeks and structures.', 1),
  ('stocks', 'Stocks', 'Equity fundamentals for active market participants.', 2),
  ('technical-analysis', 'Technical Analysis', 'Trend, momentum, volume and structure.', 3),
  ('market-structure', 'Market Structure', 'How liquidity, participants and sessions shape price.', 4),
  ('macro', 'Macro', 'Rates, inflation, growth and central banks.', 5),
  ('risk-management', 'Risk Management', 'Position sizing, invalidation and drawdown control.', 6),
  ('trading-psychology', 'Trading Psychology', 'Process, discipline and decision quality.', 7),
  ('strategy', 'Strategy', 'Frameworks for day and swing trading.', 8),
  ('ai-and-trading', 'AI & Trading', 'How machine intelligence supports — and misleads — traders.', 9),
  ('market-mechanics', 'Market Mechanics', 'Orders, exchanges, disclosures and settlement.', 10)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('reading-the-atlas-score', 'Reading the ATLAS Score', 'What a 0–100 ranking measures, what coverage means, and why a score is not a probability.', 'NSALGO Research', 'ai-and-trading', 'foundational', 6, '## A ranking, not a forecast

The ATLAS score ranks how strongly the current data lines up with a setup''s criteria. A score of 84 means the measured conditions — trend, momentum, volume, relative strength, options activity and more — align more completely than they do for a setup scoring 62. It does **not** mean an 84% chance of anything.

## How the score is built

Each factor is scored from 0 to 100 *for the setup''s direction*. A strong uptrend scores high for a long setup and low for a short one. Factor scores are then combined using weights set in the active ATLAS configuration. Day-trade and swing modes use different weights, because what matters over an afternoon differs from what matters over three weeks.

## Coverage

Some inputs are not always available — options flow classification, provider sentiment, or an economic calendar. When a factor has no data, ATLAS excludes it rather than guessing, re-normalises the remaining weights, and reports **coverage**: the share of configured weight that was actually measured. Low coverage also pulls the score toward neutral so thin evidence is never presented as conviction.

## How to use it

- Treat the score as a way to prioritise *what to investigate first*.
- Open **Why it appeared** to see the exact evidence behind each factor.
- Read **Risks** before the thesis. Every setup has a defined invalidation level.
- Compare the score against the market regime. Counter-regime setups deserve more scepticism.

A disciplined process uses rankings to allocate attention, then applies its own risk rules before acting.', null, true, 'published', array['invalidation-first', 'market-regimes-explained']::text[], '2026-09-02T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('invalidation-first', 'Invalidation First: Defining Where a Setup Is Wrong', 'Why every trade idea starts with the price that proves it wrong — and how to size around it.', 'NSALGO Research', 'risk-management', 'foundational', 7, '## Start with the exit you hope not to use

An invalidation level is the price at which the reasoning behind a setup no longer holds. If a long setup is built on price holding above its 20-day low, a close beneath that low invalidates it. The level comes from the *structure of the idea*, not from how much you are willing to lose.

## From invalidation to size

Once the invalidation is fixed, position size follows:

1. Decide the maximum you will risk on the idea — for example 0.5% of account equity.
2. Measure the distance from entry to invalidation.
3. Size = risk budget ÷ distance per share.

A wide invalidation means a smaller position; a tight one allows a larger position for the same risk. This keeps losses consistent even when volatility differs across symbols.

## Common mistakes

- **Moving the level** after entry because price is approaching it.
- **Choosing a level by round numbers** rather than structure.
- **Ignoring gaps.** Overnight gaps can jump past a level; size swing positions with that in mind.

ATLAS displays an invalidation for every setup, derived from ATR and observed structure. It is a framework for your own decision, not an order.', null, true, 'published', array['position-sizing-with-atr', 'reading-the-atlas-score']::text[], '2026-08-28T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('options-greeks-in-practice', 'The Greeks in Practice', 'Delta, gamma, theta and vega explained through the decisions they actually change.', 'NSALGO Research', 'options', 'intermediate', 9, '## Delta — directional exposure

Delta estimates how much an option''s price changes for a $1 move in the underlying. A 0.50-delta call gains roughly $0.50 per $1 rise. Delta is also a rough gauge of how far in- or out-of-the-money a contract sits. ATLAS selects contracts by delta so exposure is consistent across symbols with very different prices.

## Gamma — how quickly delta changes

Gamma is highest for at-the-money contracts close to expiration. High gamma means small moves in the underlying change your exposure quickly — useful when right, punishing when wrong.

## Theta — the cost of time

Theta is the daily decay in value, all else equal. Long options pay theta; short options collect it. Short-dated contracts decay fastest, which is why day-trade structures accept high theta for high gamma, while swing structures usually buy more time.

## Vega — sensitivity to implied volatility

Vega measures the price change for a one-point move in implied volatility. Buying options when implied volatility is elevated means paying for vega that can deflate even if direction is right — the classic post-earnings "IV crush".

## Putting it together

Before choosing a contract, ask: how much directional exposure do I want (delta), how fast should it change (gamma), how much time am I buying (theta), and am I paying up for volatility (vega)?', null, true, 'published', array['iv-rank-and-structure', 'debit-vs-credit-spreads']::text[], '2026-08-20T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('iv-rank-and-structure', 'IV Rank and Choosing a Structure', 'How implied-volatility context shifts the choice between long options, debit spreads and credit spreads.', 'NSALGO Research', 'options', 'intermediate', 6, '## What IV rank measures

IV rank places current implied volatility within its 52-week range: 0 is the lowest level of the past year, 100 the highest. It answers a simple question — is option premium cheap or expensive *for this symbol*?

## Structure follows volatility context

- **Low IV rank (below ~35):** premium is relatively inexpensive. Long calls or puts give the most exposure per dollar of vega paid.
- **Mid IV rank (~35–65):** debit spreads reduce the vega you pay by selling a further out-of-the-money contract against the one you buy.
- **High IV rank (above ~65):** credit spreads on the opposite side let you be the seller of expensive premium while defining maximum risk with a protective wing.

ATLAS applies this logic when proposing an options framework, and states when IV rank is unavailable from the data provider rather than assuming a value.

## Caveats

IV rank does not predict direction. Elevated IV often precedes known events such as earnings; the premium may be expensive for a reason.', null, false, 'published', array['options-greeks-in-practice', 'debit-vs-credit-spreads']::text[], '2026-08-14T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('debit-vs-credit-spreads', 'Debit vs. Credit Spreads', 'Two defined-risk structures, when each fits, and how their risk profiles differ.', 'NSALGO Research', 'options', 'intermediate', 7, '## Debit spreads

Buy one option and sell a further out-of-the-money option of the same type and expiration. You pay a net debit, which is your maximum loss. Maximum gain is the strike width minus the debit. A call debit spread is bullish; a put debit spread is bearish.

## Credit spreads

Sell one option and buy a further out-of-the-money option as protection. You collect a net credit, which is your maximum gain. Maximum loss is the strike width minus the credit. A put credit spread is bullish-to-neutral; a call credit spread is bearish-to-neutral.

## Choosing between them

| Consideration | Debit spread | Credit spread |
|---|---|---|
| Needs the move to happen | Yes | Not necessarily |
| Benefits from time passing | No | Yes |
| Prefers implied volatility | Lower | Higher |

Both structures cap risk, which makes them useful when a setup''s invalidation is clear but the size of the move is uncertain.', null, false, 'published', array['iv-rank-and-structure']::text[], '2026-08-08T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('position-sizing-with-atr', 'Position Sizing with ATR', 'Use Average True Range to normalise risk across calm and volatile symbols.', 'NSALGO Research', 'risk-management', 'intermediate', 5, '## ATR in one sentence

Average True Range measures the typical daily range of a security, including gaps, averaged over a lookback — commonly 14 sessions.

## Why it matters for sizing

A $1 stop on a stock with a $0.80 ATR is wide; on a stock with a $6 ATR it is noise. Expressing invalidation distance in ATR multiples puts every position on the same footing.

## A simple method

1. Set invalidation at a structural level, then check its distance in ATR terms.
2. If the distance is under ~0.5 ATR for a swing idea, it may be too tight to survive ordinary noise.
3. Size so that the distance to invalidation equals your fixed risk budget.

ATLAS reports ATR as a percentage of price and its percentile over the past six months, so you can see whether volatility is expanding or contracting.', null, false, 'published', array['invalidation-first']::text[], '2026-07-30T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('market-regimes-explained', 'Market Regimes: Risk-On, Risk-Off and Mixed', 'Why the same setup behaves differently depending on the broader tape — and how ATLAS classifies it.', 'NSALGO Research', 'market-structure', 'foundational', 6, '## Why regime matters

Breakouts follow through more often when the broad market is supportive, and fail more often in defensive tapes. Knowing the regime helps set expectations before looking at any single chart.

## The inputs ATLAS uses

- **Index trend:** S&P 500 relative to its 50- and 200-day averages.
- **Volatility:** the VIX level and its recent direction.
- **Breadth:** advancing versus declining issues.
- **Leadership:** Nasdaq and small-cap performance relative to the S&P 500.
- **Sector breadth:** how many sectors are participating.
- **Rates:** the day''s move in the 10-year Treasury yield.

Each input is shown with its reading. When an input is unavailable it is marked as such and the regime''s coverage falls.

## Using the regime

A risk-on regime does not make every long setup good — it raises the bar for shorts. A risk-off regime argues for smaller size, defined-risk structures and faster profit-taking.', null, true, 'published', array['reading-the-atlas-score', 'breadth-and-participation']::text[], '2026-07-24T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('breadth-and-participation', 'Breadth and Participation', 'Advance/decline data, new highs and lows, and why narrow rallies deserve caution.', 'NSALGO Research', 'market-structure', 'intermediate', 5, '## What breadth measures

Index levels are dominated by the largest companies. Breadth asks how many stocks are participating: advancers versus decliners, the share above key moving averages, and new highs versus new lows.

## Reading it

- **Broad advance:** most stocks rising with the index — a healthy tape.
- **Narrow advance:** the index rises while most stocks fall — leadership is concentrated and more fragile.
- **Divergence:** the index makes a new high while fewer stocks confirm it.

Breadth is not a timing tool on its own. It is context that raises or lowers confidence in index-level moves.', null, false, 'published', array['market-regimes-explained']::text[], '2026-07-16T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('reading-fomc-days', 'Trading Around FOMC Decisions', 'What changes on Federal Reserve decision days and how to manage event risk.', 'NSALGO Research', 'macro', 'intermediate', 6, '## The shape of the day

FOMC statements are released at 2:00 p.m. ET, followed by the Chair''s press conference. Morning trade is often subdued; volatility clusters around the release and during the press conference, when the market reinterprets the statement.

## What moves markets

The decision itself is usually priced in. Markets react to changes in the statement''s language, the Summary of Economic Projections (at quarterly meetings), and the tone of the press conference.

## Managing event risk

- Reduce size or use defined-risk structures into the release.
- Expect implied volatility in short-dated options to fall after the event.
- Wait for the first reaction to settle before acting on it.

ATLAS reduces the economic-calendar factor for day-trade setups when a high-importance release falls within the next session.', null, false, 'published', array['market-regimes-explained']::text[], '2026-07-09T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('public-disclosures-guide', 'Insider and Congressional Disclosures: What They Are and Aren''t', 'Forms 3, 4 and 5, 13F filings and Periodic Transaction Reports — how to read them responsibly.', 'NSALGO Research', 'market-mechanics', 'foundational', 8, '## Section 16 filings

Company officers, directors and holders of more than 10% of a class of shares file **Form 3** when they become insiders, **Form 4** within two business days of most transactions, and **Form 5** annually for certain deferred items. Transaction codes distinguish open-market purchases (P) and sales (S) from option exercises (M), grants (A), gifts (G) and tax withholding (F).

Open-market purchases are often considered the most informative; many sales are pre-planned under Rule 10b5-1 or relate to taxes and diversification.

## 13F filings

Institutional investment managers above the reporting threshold file **Form 13F** quarterly, within 45 days of quarter end. It is a delayed snapshot of long U.S. equity positions — it does not show shorts, most derivatives, or intra-quarter trading.

## Congressional Periodic Transaction Reports

Under the STOCK Act, members of Congress report many securities transactions within 45 days. Values are reported in **ranges**, not exact amounts, and transactions may belong to a spouse or dependent.

## Reading responsibly

A disclosure records that a transaction occurred. It does not establish intent, and it does not imply wrongdoing. NSALGO displays these records with their source documents so you can read the original filing.', null, true, 'published', array[]::text[], '2026-07-01T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('process-over-outcome', 'Process over Outcome', 'Separating decision quality from results — the foundation of improving as a trader.', 'NSALGO Research', 'trading-psychology', 'foundational', 5, '## Good decisions can lose

Markets are probabilistic. A well-reasoned trade with defined risk can lose; a reckless one can win. Judging decisions by single outcomes rewards luck and punishes discipline.

## Review the decision, not the P&L

For each trade, record:

- The setup and why it qualified.
- The invalidation and the size it implied.
- Whether you followed the plan.

Over dozens of trades, the plan''s results become visible. Over one trade, they are noise.

## Transparency helps

This is why ATLAS keeps every setup it has generated — including those that were invalidated — in its history. A record that hides losing ideas cannot be learned from.', null, false, 'published', array['invalidation-first']::text[], '2026-06-24T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('swing-trading-framework', 'A Swing Trading Framework', 'Trend, relative strength and structure: a repeatable approach for multi-day holding periods.', 'NSALGO Research', 'strategy', 'intermediate', 8, '## 1. Start with the regime

Swing trades are held through several sessions of market noise. Aligning with the broader regime improves the odds that noise works with you rather than against you.

## 2. Filter for trend and relative strength

Look for stocks above rising 50-day averages that are outperforming the S&P 500 over 20 and 60 sessions. Leadership tends to persist longer than intuition suggests.

## 3. Wait for structure

The best entries often follow a period of contraction — narrowing ranges and declining volume — resolved by expansion on above-average volume through a recent high.

## 4. Define the plan before entry

- Entry zone near the trigger.
- Invalidation beneath the structure that justified the trade.
- A target zone measured in ATR multiples or at prior resistance.
- A time stop: if the move hasn''t developed within the expected horizon, reassess.

## 5. Mind the calendar

Earnings inside the holding period turn a technical trade into a binary event. ATLAS flags scheduled earnings inside the horizon as a risk factor.', null, false, 'published', array['position-sizing-with-atr', 'market-regimes-explained']::text[], '2026-06-17T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('vwap-for-intraday-context', 'VWAP for Intraday Context', 'How the volume-weighted average price frames intraday trend and institutional execution.', 'NSALGO Research', 'technical-analysis', 'foundational', 4, '## Definition

VWAP is the average price of every share traded during the session, weighted by volume. It resets each day.

## Why traders watch it

Large participants often benchmark execution against VWAP. Price holding above a rising VWAP suggests buyers have controlled the session; repeated failures at VWAP suggest the opposite.

## Using it in a plan

- For intraday longs, a reclaim of VWAP can act as a trigger and a loss of VWAP as invalidation.
- Distance from VWAP helps judge extension: entries far above it carry more reversion risk.

ATLAS uses VWAP in day-trade mode both as a structural input and to anchor invalidation when it sits nearby.', null, false, 'published', array['swing-trading-framework']::text[], '2026-06-10T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;

insert into educational_articles (slug, title, description, author_name, category_slug, difficulty, read_minutes, content, featured_image, featured, status, related_slugs, published_at) values ('limits-of-ai-in-markets', 'The Limits of AI in Markets', 'Where machine intelligence helps traders, where it misleads, and how NSALGO constrains it.', 'NSALGO Research', 'ai-and-trading', 'foundational', 6, '## What AI does well

Language models are excellent at organising information: summarising many signals, explaining relationships, and presenting context consistently.

## Where it fails

Models can state plausible numbers that are not real. They can sound confident about outcomes that are inherently uncertain. Left unconstrained, they are a poor source of market data.

## How NSALGO constrains it

- **Signals come from the engine, not the model.** Scores, levels and factor readings are computed deterministically from market data.
- **Explanations are grounded.** The model receives a structured digest and is instructed to use only its contents. Every numeric claim is checked against that digest; an explanation that cites an unsupported number is discarded and replaced by a deterministic summary.
- **Inputs are retained.** Every explanation is stored with the digest it was generated from, so it can be audited.
- **No certainty language.** Rankings are presented as rankings.

AI in NSALGO is a narrator for measured evidence — never the evidence itself.', null, false, 'published', array['reading-the-atlas-score']::text[], '2026-06-03T13:00:00.000Z'::timestamptz)
on conflict (slug) do nothing;
