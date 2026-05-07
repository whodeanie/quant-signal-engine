// Three classic trading strategies, each implemented as a pure function from
// OHLC bars to a parallel array of position targets.
//
// Position target semantics:
//   "long" means hold one position of the asset on the next bar
//   "flat" means hold cash on the next bar
//
// Signals are evaluated at the close of bar k. The backtester transitions the
// portfolio at the open of bar k + 1 to avoid look ahead bias.

import type { Bar, Side, StrategyId } from "./types";
import { rsi, sma, bollinger } from "./indicators";

export type StrategyParams = {
  rsi_mean_reversion: { period: number; oversold: number; overbought: number };
  ma_crossover: { fast: number; slow: number };
  bollinger_breakout: { period: number; numStd: number };
};

export const DEFAULT_PARAMS: StrategyParams = {
  rsi_mean_reversion: { period: 14, oversold: 30, overbought: 70 },
  ma_crossover: { fast: 50, slow: 200 },
  bollinger_breakout: { period: 20, numStd: 2 }
};

/**
 * Mean reversion. Buy when RSI dips below the oversold line, sell back to flat
 * when RSI climbs above the overbought line. Holds in between.
 */
export function rsiMeanReversion(
  bars: Bar[],
  params: StrategyParams["rsi_mean_reversion"] = DEFAULT_PARAMS.rsi_mean_reversion
): Side[] {
  const closes = bars.map((b) => b.adjClose);
  const rsiVals = rsi(closes, params.period);

  const targets: Side[] = new Array(bars.length).fill("flat");
  let position: Side = "flat";

  for (let i = 0; i < bars.length; i++) {
    const r = rsiVals[i];
    if (Number.isFinite(r)) {
      const rv = r as number;
      if (position === "flat" && rv < params.oversold) position = "long";
      else if (position === "long" && rv > params.overbought) position = "flat";
    }
    targets[i] = position;
  }
  return targets;
}

/**
 * Moving average crossover. Hold long while the fast SMA is above the slow SMA
 * (golden cross regime), flat otherwise (death cross regime).
 */
export function maCrossover(
  bars: Bar[],
  params: StrategyParams["ma_crossover"] = DEFAULT_PARAMS.ma_crossover
): Side[] {
  if (params.fast >= params.slow) {
    throw new Error("ma_crossover requires fast period less than slow period");
  }
  const closes = bars.map((b) => b.adjClose);
  const fast = sma(closes, params.fast);
  const slow = sma(closes, params.slow);

  const targets: Side[] = new Array(bars.length).fill("flat");
  for (let i = 0; i < bars.length; i++) {
    const f = fast[i];
    const s = slow[i];
    if (Number.isFinite(f) && Number.isFinite(s)) {
      targets[i] = (f as number) > (s as number) ? "long" : "flat";
    }
  }
  return targets;
}

/**
 * Bollinger band breakout. Buy when the close pierces above the upper band,
 * exit when the close drops back below the middle band (the SMA mean).
 * The middle band exit avoids whipsaws when volatility expands then snaps back.
 */
export function bollingerBreakout(
  bars: Bar[],
  params: StrategyParams["bollinger_breakout"] = DEFAULT_PARAMS.bollinger_breakout
): Side[] {
  const closes = bars.map((b) => b.adjClose);
  const { upper, middle } = bollinger(closes, params.period, params.numStd);

  const targets: Side[] = new Array(bars.length).fill("flat");
  let position: Side = "flat";
  for (let i = 0; i < bars.length; i++) {
    const c = closes[i];
    const u = upper[i];
    const m = middle[i];
    if (Number.isFinite(u) && Number.isFinite(m) && Number.isFinite(c)) {
      const close = c as number;
      if (position === "flat" && close > (u as number)) position = "long";
      else if (position === "long" && close < (m as number)) position = "flat";
    }
    targets[i] = position;
  }
  return targets;
}

export function runStrategy(id: StrategyId, bars: Bar[], params?: Partial<StrategyParams[StrategyId]>): Side[] {
  switch (id) {
    case "rsi_mean_reversion":
      return rsiMeanReversion(bars, { ...DEFAULT_PARAMS.rsi_mean_reversion, ...(params as object) });
    case "ma_crossover":
      return maCrossover(bars, { ...DEFAULT_PARAMS.ma_crossover, ...(params as object) });
    case "bollinger_breakout":
      return bollingerBreakout(bars, { ...DEFAULT_PARAMS.bollinger_breakout, ...(params as object) });
  }
}

export const STRATEGY_META: Record<StrategyId, { name: string; blurb: string }> = {
  rsi_mean_reversion: {
    name: "RSI Mean Reversion",
    blurb:
      "Buy oversold pullbacks (RSI under 30), exit when momentum returns (RSI over 70). Works best in range bound markets, struggles in strong trends."
  },
  ma_crossover: {
    name: "Moving Average Crossover",
    blurb:
      "Hold during the golden cross regime (50 day SMA above 200 day), flat during the death cross. The textbook trend follower."
  },
  bollinger_breakout: {
    name: "Bollinger Band Breakout",
    blurb:
      "Buy on a 2 standard deviation upside breakout, exit back to the SMA mean. Captures volatility expansion, suffers in choppy mean reverting tape."
  }
};
