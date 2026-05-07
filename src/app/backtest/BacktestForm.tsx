"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AICommentary, BacktestResult, StrategyId } from "@/lib/types";
import { STRATEGY_META } from "@/lib/strategies";
import { EquityChart } from "@/components/EquityChart";
import { DrawdownChart } from "@/components/DrawdownChart";
import { StatsGrid } from "@/components/StatsGrid";
import { TradeTable } from "@/components/TradeTable";
import { CommentaryPanel } from "@/components/CommentaryPanel";
import { Disclaimer } from "@/components/Disclaimer";

type Suggestion = { symbol: string; name: string };

type LiteResult = Omit<BacktestResult, "bars" | "signals">;

const STRATEGIES: { id: StrategyId; label: string }[] = [
  { id: "ma_crossover", label: "Moving Average Crossover (50 / 200)" },
  { id: "rsi_mean_reversion", label: "RSI Mean Reversion (14, 30 / 70)" },
  { id: "bollinger_breakout", label: "Bollinger Band Breakout (20, 2 stdev)" }
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function yearsAgoIso(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

export default function BacktestForm() {
  const search = useSearchParams();
  const router = useRouter();

  const [symbol, setSymbol] = useState(search.get("symbol") ?? "SPY");
  const [strategy, setStrategy] = useState<StrategyId>((search.get("strategy") as StrategyId) ?? "ma_crossover");
  const [from, setFrom] = useState(search.get("from") ?? yearsAgoIso(10));
  const [to, setTo] = useState(search.get("to") ?? todayIso());
  const [capital, setCapital] = useState<number>(Number(search.get("capital") ?? 10000));
  const [maxFrac, setMaxFrac] = useState<number>(Number(search.get("maxFrac") ?? 0.25));

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LiteResult | null>(null);
  const [commentary, setCommentary] = useState<AICommentary | null>(null);

  // Symbol autocomplete
  useEffect(() => {
    const q = symbol.trim();
    if (!q || q.length < 1) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/symbols?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as { results?: Suggestion[] };
        setSuggestions(json.results ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [symbol]);

  const queryString = useMemo(() => {
    const sp = new URLSearchParams({ symbol, strategy, from, to, capital: String(capital), maxFrac: String(maxFrac) });
    return sp.toString();
  }, [symbol, strategy, from, to, capital, maxFrac]);

  const onSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setLoading(true);
      setError(null);
      setResult(null);
      setCommentary(null);
      router.replace(`/backtest?${queryString}`);
      try {
        const res = await fetch("/api/backtest", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ symbol, strategy, from, to, capital, maxPositionFraction: maxFrac })
        });
        const json = (await res.json()) as { result?: LiteResult; commentary?: AICommentary; error?: string };
        if (!res.ok || !json.result) {
          throw new Error(json.error ?? `Server returned ${res.status}`);
        }
        setResult(json.result);
        setCommentary(json.commentary ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "unknown error");
      } finally {
        setLoading(false);
      }
    },
    [symbol, strategy, from, to, capital, maxFrac, queryString, router]
  );

  // Auto run if URL contains a symbol param.
  useEffect(() => {
    if (search.get("symbol")) {
      void onSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2 relative">
          <label className="label">Symbol</label>
          <input
            className="input"
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value.toUpperCase());
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="AAPL"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-ink-600 bg-ink-800 shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s.symbol}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 hover:bg-ink-700"
                    onClick={() => {
                      setSymbol(s.symbol);
                      setShowSuggestions(false);
                    }}
                  >
                    <span className="font-mono text-signal-gold">{s.symbol}</span>{" "}
                    <span className="muted text-sm">{s.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="label">Strategy</label>
          <select className="input" value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)}>
            {STRATEGIES.map((s) => (
              <option value={s.id} key={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Capital ($)</label>
          <input
            className="input"
            type="number"
            min={100}
            step={100}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Max position fraction</label>
          <input
            className="input"
            type="number"
            min={0.05}
            max={1}
            step={0.05}
            value={maxFrac}
            onChange={(e) => setMaxFrac(Number(e.target.value))}
          />
        </div>
        <div className="md:col-span-6 flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Running backtest..." : "Run backtest"}
          </button>
          <p className="subtle">{STRATEGY_META[strategy].blurb}</p>
        </div>
      </form>

      {error && (
        <div className="card border-signal-bear/60">
          <p className="text-signal-bear font-semibold">Backtest failed</p>
          <p className="muted text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-bold">
                {result.symbol} {" "}
                <span className="text-signal-gold">{STRATEGY_META[result.strategy].name}</span>
              </h2>
              <p className="muted text-sm">
                {result.stats.startDate} to {result.stats.endDate}
              </p>
            </div>
          </header>

          <StatsGrid stats={result.stats} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EquityChart equity={result.equity} startingCapital={result.stats.startingCapital} />
            <DrawdownChart equity={result.equity} />
          </div>

          {commentary && <CommentaryPanel commentary={commentary} />}

          <TradeTable trades={result.trades} />

          <Disclaimer />
        </div>
      )}

      {!result && !error && (
        <div className="space-y-3">
          <Disclaimer />
        </div>
      )}
    </div>
  );
}
