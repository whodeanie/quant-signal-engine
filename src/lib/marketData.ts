// Market data layer.
//
// Sources tried in order:
//   1. NASDAQ public quote API (free, no key, reliable from serverless).
//      Works for stocks (assetclass=stocks) and ETFs (assetclass=etf).
//   2. yahoo-finance2 chart API (free, no key, but Yahoo often rate limits
//      serverless IPs, so we try NASDAQ first).
//   3. Alpha Vantage TIME_SERIES_DAILY_ADJUSTED (free tier 500 req per day,
//      requires ALPHA_VANTAGE_API_KEY).
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
  const errors: string[] = [];

  // 1. NASDAQ first (most reliable from serverless).
  try {
    bars = await fetchNasdaq(symbol, from, to);
  } catch (err) {
    errors.push(`NASDAQ: ${errMsg(err)}`);
  }

  // 2. Yahoo as a second try.
  if (bars.length === 0) {
    try {
      bars = await fetchYahoo(symbol, from, to);
    } catch (err) {
      errors.push(`Yahoo: ${errMsg(err)}`);
    }
  }

  // 3. Alpha Vantage (only when key is set).
  if (bars.length === 0 && process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const all = await fetchAlphaVantage(symbol);
      bars = all.filter((b) => b.date >= from && b.date <= to);
    } catch (err) {
      errors.push(`Alpha Vantage: ${errMsg(err)}`);
    }
  }

  if (bars.length === 0) {
    throw new Error(
      `No bars returned for ${symbol} between ${from} and ${to}. Sources tried: ${errors.join(" | ") || "none reached"}`
    );
  }

  memoryCache.set(key, bars);
  return bars;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

type NasdaqRow = {
  date?: string;
  close?: string;
  volume?: string;
  open?: string;
  high?: string;
  low?: string;
};

/**
 * NASDAQ public quote API. Returns OHLC and volume for the requested window.
 * Works without an API key and is not aggressively rate limited from
 * serverless environments. The endpoint caps responses around 5 years of
 * daily data, so longer windows are fetched in yearly chunks and stitched
 * back together.
 *
 * Endpoint format:
 *   https://api.nasdaq.com/api/quote/{SYMBOL}/historical
 *     ?assetclass={stocks|etf|index}
 *     &fromdate=YYYY-MM-DD
 *     &todate=YYYY-MM-DD
 *     &limit=2000
 */
async function fetchNasdaq(symbol: string, from: string, to: string): Promise<Bar[]> {
  const startYear = parseInt(from.slice(0, 4), 10);
  const endYear = parseInt(to.slice(0, 4), 10);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    throw new Error("Invalid from/to dates passed to NASDAQ fetcher");
  }

  // Try ETF assetclass first (works for SPY, QQQ, etc.). If empty, try stocks.
  const assetClasses: ("etf" | "stocks" | "index")[] = ["etf", "stocks", "index"];

  for (const assetClass of assetClasses) {
    const collected: Bar[] = [];
    let chunksSucceeded = 0;
    for (let y = startYear; y <= endYear; y += 5) {
      const chunkFrom = y === startYear ? from : `${y}-01-01`;
      const chunkToYear = Math.min(y + 4, endYear);
      const chunkTo = chunkToYear === endYear ? to : `${chunkToYear}-12-31`;
      try {
        const chunk = await fetchNasdaqChunk(symbol, chunkFrom, chunkTo, assetClass);
        if (chunk.length > 0) {
          collected.push(...chunk);
          chunksSucceeded += 1;
        }
      } catch {
        // continue, try next chunk
      }
    }
    if (chunksSucceeded > 0 && collected.length > 0) {
      // Deduplicate by date and sort ascending.
      const map = new Map<string, Bar>();
      for (const b of collected) map.set(b.date, b);
      return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }
  }
  throw new Error("NASDAQ returned no data for any asset class");
}

async function fetchNasdaqChunk(
  symbol: string,
  from: string,
  to: string,
  assetClass: string
): Promise<Bar[]> {
  const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/historical?assetclass=${assetClass}&fromdate=${from}&todate=${to}&limit=4000`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      Accept: "application/json"
    }
  });
  if (!res.ok) throw new Error(`NASDAQ HTTP ${res.status}`);
  const json = (await res.json()) as {
    data?: { tradesTable?: { rows?: NasdaqRow[] } };
    status?: { rCode?: number };
  };
  const rows = json?.data?.tradesTable?.rows ?? [];
  if (rows.length === 0) throw new Error("NASDAQ returned an empty trades table");

  const bars: Bar[] = [];
  for (const row of rows) {
    const date = parseUsDate(row.date);
    if (!date) continue;
    const open = parseMoney(row.open);
    const high = parseMoney(row.high);
    const low = parseMoney(row.low);
    const close = parseMoney(row.close);
    const volume = parseInt((row.volume ?? "0").replace(/,/g, ""), 10) || 0;
    if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close)) {
      continue;
    }
    bars.push({ date, open, high, low, close, adjClose: close, volume });
  }
  return bars;
}

function parseUsDate(s: string | undefined): string | null {
  if (!s) return null;
  // Format: MM/DD/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1]}-${m[2]}`;
}

function parseMoney(s: string | undefined): number {
  if (!s) return NaN;
  return Number(s.replace(/[$,]/g, ""));
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
