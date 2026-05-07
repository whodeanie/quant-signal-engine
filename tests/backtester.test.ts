import { describe, it, expect } from "vitest";
import { runBacktest } from "../src/lib/backtester";
import type { Bar } from "../src/lib/types";

function syntheticBars(n: number, drift: number = 0.001, seed: number = 1): Bar[] {
  const bars: Bar[] = [];
  let price = 100;
  let r = seed;
  for (let i = 0; i < n; i++) {
    // Deterministic pseudo random walk so tests are reproducible.
    r = (r * 9301 + 49297) % 233280;
    const noise = (r / 233280 - 0.5) * 0.02;
    const ret = drift + noise;
    const open = price;
    const close = price * (1 + ret);
    const high = Math.max(open, close) * 1.005;
    const low = Math.min(open, close) * 0.995;
    const date = new Date(2020, 0, i + 1).toISOString().slice(0, 10);
    bars.push({ date, open, high, low, close, adjClose: close, volume: 1_000_000 });
    price = close;
  }
  return bars;
}

describe("runBacktest", () => {
  it("produces an equity curve the same length as the input bars", () => {
    const bars = syntheticBars(400);
    const result = runBacktest(bars, "ma_crossover", { startingCapital: 10000, maxPositionFraction: 0.25 });
    expect(result.equity.length).toBe(bars.length);
  });

  it("computes a non zero buy and hold benchmark over a trending series", () => {
    const bars = syntheticBars(400, 0.002);
    const result = runBacktest(bars, "ma_crossover", { startingCapital: 10000, maxPositionFraction: 0.25 });
    expect(result.stats.buyHoldReturnPct).toBeGreaterThan(0);
  });

  it("never lets ending equity exceed the buy and hold equity by more than 100x", () => {
    // Sanity test: if ending equity blew up to absurd levels we likely had a math bug.
    const bars = syntheticBars(400);
    const result = runBacktest(bars, "rsi_mean_reversion", {
      startingCapital: 10000,
      maxPositionFraction: 0.25
    });
    const buyHoldEnd = 10000 * (1 + result.stats.buyHoldReturnPct);
    expect(result.stats.endingEquity).toBeLessThan(buyHoldEnd * 100);
  });
});
