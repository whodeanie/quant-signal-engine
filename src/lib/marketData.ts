// Market data layer.
//
// Primary source: yahoo-finance2 (no API key required).
// Backup source: Alpha Vantage (free tier, 500 requests per day, requires
// ALPHA_VANTAGE_API_KEY env var). Falls back automatically if Yahoo throws.
//
// Caching: results are cached in memory for the lifetime of the server process,
// keyed by symbol and date range. This is enough to make repeated backtests
// against the same window snappy. Production deployments should swap in a
// persistent cache.

import yahooFinance from "yahoo-finance2";
import type { Bar } from "./types";

type CacheKey = string;
const memoryCache = new Map<CacheKey, Bar[]>();

function makeKey(symbol: string, from: string, to: string): CacheKey {
  return `${symbol.toUpperCase()}|${from}|${to}`;
}

export async function fetchBars(symbol: string, from: string, to: string): Promise<Bar[]> {
  const key = makeKey(symbol, from, to);
  const cached = memoryCache.get(key);
  if (cached) return cached;

  let bars: Bar[] = [];
  try {
    bars = await fetchYahoo(symbol, from, to);
  } catch (yahooErr) {
    console.warn(`[marketData] Yahoo failed for ${symbol}, falling back to Alpha Vantage:`, yahooErr);
    bars = await fetchAlphaVantage(symbol);
    bars = bars.filter((b) => b.date >= from && b.date <= to);
  }

  if (bars.length === 0) {
    throw new Error(`No bars returned for ${symbol} between ${from} and ${to}`);
  }

  memoryCache.set(key, bars);
  return bars;
}

async function fetchYahoo(symbol: string, from: string, to: string): Promise<Bar[]> {
  const period1 = new Date(from);
  const period2 = new Date(to);
  // chart() supersedes historical(); returns objects with adjclose populated.
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d"
  });
  const quotes = result.quotes ?? [];
  const bars: Bar[] = [];
  for (const q of quotes) {
    if (
      q.date &&
      typeof q.open === "number" &&
      typeof q.high === "number" &&
      typeof q.low === "number" &&
      typeof q.close === "number" &&
      typeof q.volume === "number"
    ) {
      const adjClose = typeof q.adjclose === "number" ? q.adjclose : q.close;
      bars.push({
        date: q.date.toISOString().slice(0, 10),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        adjClose,
        volume: q.volume
      });
    }
  }
  return bars;
}

type AlphaVantageRow = {
  "1. open": string;
  "2. high": string;
  "3. low": string;
  "4. close": string;
  "5. adjusted close"?: string;
  "6. volume"?: string;
  "5. volume"?: string;
};

async function fetchAlphaVantage(symbol: string): Promise<Bar[]> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) {
    throw new Error(
      "ALPHA_VANTAGE_API_KEY is not set and Yahoo Finance is unreachable. Cannot fetch market data."
    );
  }
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", key);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Alpha Vantage HTTP ${res.status}`);
  const json = (await res.json()) as { "Time Series (Daily)"?: Record<string, AlphaVantageRow> };
  const series = json["Time Series (Daily)"];
  if (!series) throw new Error("Alpha Vantage returned no series. Likely rate limited.");

  const bars: Bar[] = [];
  for (const date of Object.keys(series).sort()) {
    const row = series[date];
    if (!row) continue;
    bars.push({
      date,
      open: Number(row["1. open"]),
      high: Number(row["2. high"]),
      low: Number(row["3. low"]),
      close: Number(row["4. close"]),
      adjClose: Number(row["5. adjusted close"] ?? row["4. close"]),
      volume: Number(row["6. volume"] ?? row["5. volume"] ?? 0)
    });
  }
  return bars;
}

/**
 * Symbol autocomplete using Yahoo Finance search. Returns up to 8 candidates.
 */
export async function searchSymbols(query: string): Promise<{ symbol: string; name: string }[]> {
  if (!query.trim()) return [];
  try {
    const result = await yahooFinance.search(query, { quotesCount: 8, newsCount: 0 });
    const quotes = result.quotes ?? [];
    return quotes
      .filter((q) => "symbol" in q && q.symbol)
      .map((q) => {
        const symbol = (q as { symbol?: string }).symbol ?? "";
        const name =
          (q as { shortname?: string; longname?: string }).shortname ??
          (q as { longname?: string }).longname ??
          symbol;
        return { symbol, name };
      })
      .filter((x) => x.symbol);
  } catch {
    return [];
  }
}
