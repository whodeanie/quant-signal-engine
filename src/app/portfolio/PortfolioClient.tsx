"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { BacktestResult, EquityPoint, StrategyId } from "@/lib/types";
import { Disclaimer } from "@/components/Disclaimer";
import { EquityChart } from "@/components/EquityChart";
import { fmtPct, fmtUsd, statColor } from "@/lib/format";

type Subscription = { id: string; symbol: string; strategy: StrategyId; weight: number };

type Portfolio = {
  startDate: string;
  startingCapital: number;
  subscriptions: Subscription[];
};

type LiteResult = Omit<BacktestResult, "bars" | "signals">;

const STORAGE_KEY = "quant-signal-engine.portfolio.v1";

const DEFAULT_PORTFOLIO: Portfolio = {
  startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  startingCapital: 10000,
  subscriptions: [
    { id: "1", symbol: "SPY", strategy: "ma_crossover", weight: 0.4 },
    { id: "2", symbol: "AAPL", strategy: "rsi_mean_reversion", weight: 0.3 },
    { id: "3", symbol: "NVDA", strategy: "bollinger_breakout", weight: 0.3 }
  ]
};

const STRATEGY_OPTIONS: { id: StrategyId; label: string }[] = [
  { id: "ma_crossover", label: "MA Crossover (50/200)" },
  { id: "rsi_mean_reversion", label: "RSI Mean Reversion" },
  { id: "bollinger_breakout", label: "Bollinger Breakout" }
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PortfolioClient() {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => {
    if (typeof window === "undefined") return DEFAULT_PORTFOLIO;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Portfolio) : DEFAULT_PORTFOLIO;
    } catch {
      return DEFAULT_PORTFOLIO;
    }
  });
  const [results, setResults] = useState<LiteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  const totalWeight = useMemo(
    () => portfolio.subscriptions.reduce((s, x) => s + x.weight, 0),
    [portfolio.subscriptions]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await Promise.all(
        portfolio.subscriptions.map((sub) =>
          fetch("/api/backtest", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              symbol: sub.symbol,
              strategy: sub.strategy,
              from: portfolio.startDate,
              to: todayIso(),
              capital: portfolio.startingCapital * (sub.weight / Math.max(totalWeight, 0.0001)),
              maxPositionFraction: 0.25,
              withCommentary: false
            })
          }).then((r) => r.json() as Promise<{ result?: LiteResult; error?: string }>)
        )
      );
      const ok = res.filter((r) => r.result).map((r) => r.result as LiteResult);
      const fail = res.find((r) => r.error);
      if (fail && ok.length === 0) throw new Error(fail.error);
      setResults(ok);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [portfolio, totalWeight]);

  // Aggregate equity curves into a single portfolio curve.
  const aggregate = useMemo<EquityPoint[]>(() => {
    if (results.length === 0) return [];
    const dateMap = new Map<string, number>();
    for (const r of results) {
      for (const p of r.equity) {
        dateMap.set(p.date, (dateMap.get(p.date) ?? 0) + p.equity);
      }
    }
    const sorted = [...dateMap.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    let peak = 0;
    return sorted.map(([date, equity]) => {
      if (equity > peak) peak = equity;
      const drawdown = peak > 0 ? equity / peak - 1 : 0;
      return { date, equity, drawdown };
    });
  }, [results]);

  const totalReturn =
    aggregate.length > 0
      ? (aggregate[aggregate.length - 1]!.equity - portfolio.startingCapital) / portfolio.startingCapital
      : 0;

  const onAdd = () => {
    setPortfolio({
      ...portfolio,
      subscriptions: [
        ...portfolio.subscriptions,
        { id: crypto.randomUUID(), symbol: "MSFT", strategy: "ma_crossover", weight: 0.1 }
      ]
    });
  };

  const onRemove = (id: string) => {
    setPortfolio({ ...portfolio, subscriptions: portfolio.subscriptions.filter((s) => s.id !== id) });
  };

  const onPatch = (id: string, patch: Partial<Subscription>) => {
    setPortfolio({
      ...portfolio,
      subscriptions: portfolio.subscriptions.map((s) => (s.id === id ? { ...s, ...patch } : s))
    });
  };

  return (
    <div className="space-y-6">
      <Disclaimer compact />

      <div className="card space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="label">Start date</label>
            <input
              className="input"
              type="date"
              value={portfolio.startDate}
              onChange={(e) => setPortfolio({ ...portfolio, startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Starting capital ($)</label>
            <input
              className="input"
              type="number"
              min={100}
              step={100}
              value={portfolio.startingCapital}
              onChange={(e) => setPortfolio({ ...portfolio, startingCapital: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn-primary" onClick={() => void refresh()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh paper portfolio"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Signal subscriptions</h3>
            <button className="btn" type="button" onClick={onAdd}>
              Add subscription
            </button>
          </div>
          {portfolio.subscriptions.map((sub) => (
            <div key={sub.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <label className="label">Symbol</label>
                <input
                  className="input"
                  value={sub.symbol}
                  onChange={(e) => onPatch(sub.id, { symbol: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="col-span-5">
                <label className="label">Strategy</label>
                <select
                  className="input"
                  value={sub.strategy}
                  onChange={(e) => onPatch(sub.id, { strategy: e.target.value as StrategyId })}
                >
                  {STRATEGY_OPTIONS.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="label">Weight</label>
                <input
                  className="input"
                  type="number"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={sub.weight}
                  onChange={(e) => onPatch(sub.id, { weight: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-1">
                <button className="btn" type="button" onClick={() => onRemove(sub.id)}>
                  X
                </button>
              </div>
            </div>
          ))}
          <p className="subtle">Total weight: {totalWeight.toFixed(2)}. Weights normalize automatically.</p>
        </div>
      </div>

      {error && (
        <div className="card border-signal-bear/60">
          <p className="text-signal-bear font-semibold">Refresh failed</p>
          <p className="muted text-sm">{error}</p>
        </div>
      )}

      {aggregate.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="kpi">
              <div className="kpi-label">Equity</div>
              <div className="kpi-value">{fmtUsd(aggregate[aggregate.length - 1]!.equity)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total return</div>
              <div className={`kpi-value ${statColor(totalReturn)}`}>{fmtPct(totalReturn)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Subscriptions</div>
              <div className="kpi-value">{portfolio.subscriptions.length}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Since</div>
              <div className="kpi-value">{portfolio.startDate}</div>
            </div>
          </div>
          <EquityChart equity={aggregate} startingCapital={portfolio.startingCapital} />
        </>
      )}
    </div>
  );
}
