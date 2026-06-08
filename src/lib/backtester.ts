// Walk forward backtester.
//
// Mechanics:
//   1. The strategy outputs a target position (long or flat) on every bar close.
//   2. The backtester transitions the portfolio at the OPEN of the next bar,
//      so today's signal cannot use a price that was unknown when the signal
//      fired. This avoids look ahead bias.
//   3. Position size is set by a Kelly fraction estimated from realized
//      historical edge to date, capped at the user provided maximum.
//   4. Trade PnL is realized when the position transitions back to flat.
//   5. Equity is marked to market every bar so the equity curve and drawdown
//      reflect open trade exposure too.
//
// Caveats the user should know about:
//   - Backtests are still subject to survivorship bias (the symbol existed for
//     the entire window) and look ahead via parameter selection.
//   - Slippage and commissions default to zero. Real returns will be lower.
//   - Kelly is estimated on cumulative trades, not future expected value.

import type { Bar, BacktestResult, BacktestStats, EquityPoint, Side, StrategyId, Trade } from "./types";
import { runStrategy, type StrategyParams } from "./strategies";

export type BacktestConfig = {
  startingCapital: number;
  /** Fraction of equity allocated when going long. Capped Kelly recommended. */
  maxPositionFraction: number;
  /** Per share commission applied on entry and exit. Default 0. */
  commissionPerShare?: number;
  /** Per fill slippage in basis points (100 bps == 1 percent). Default 0. */
  slippageBps?: number;
};

const TRADING_DAYS_PER_YEAR = 252;

/**
 * Capped Kelly fraction estimated from realized trade history.
 * If win rate or payoff ratio cannot be estimated yet (fewer than 5 trades),
 * fall back to half of the user provided cap so early trades still size up.
 */
function kellyFraction(closedTrades: Trade[], cap: number): number {
  if (closedTrades.length < 5) return cap * 0.5;

  const wins = closedTrades.filter((t) => t.pnl > 0);
  const losses = closedTrades.filter((t) => t.pnl < 0);
  if (wins.length === 0 || losses.length === 0) return cap * 0.5;

  const winRate = wins.length / closedTrades.length;
  const avgWinPct = wins.reduce((s, t) => s + t.returnPct, 0) / wins.length;
  const avgLossPct = -losses.reduce((s, t) => s + t.returnPct, 0) / losses.length;
  if (avgLossPct === 0) return cap;

  const payoff = avgWinPct / avgLossPct;
  // Classic Kelly. f* = W - (1 - W) / R
  const kelly = winRate - (1 - winRate) / payoff;
  if (!Number.isFinite(kelly) || kelly <= 0) return 0;
  return Math.min(kelly, cap);
}

function applySlippage(price: number, bps: number, side: "buy" | "sell"): number {
  if (!bps) return price;
  const adjustment = price * (bps / 10000);
  return side === "buy" ? price + adjustment : price - adjustment;
}

export function runBacktest(
  bars: Bar[],
  strategy: StrategyId,
  config: BacktestConfig,
  params?: Partial<StrategyParams[StrategyId]>
): BacktestResult {
  validateBacktestInputs(bars, config);
  if (bars.length < 30) throw new Error("Need at least 30 bars to run a backtest");

  const signals = runStrategy(strategy, bars, params);
  const slippageBps = config.slippageBps ?? 0;
  const commission = config.commissionPerShare ?? 0;

  let cash = config.startingCapital;
  let shares = 0;
  let position: Side = "flat";
  let entryPrice = 0;
  let entryDate = "";
  let entryBarIndex = -1;
  let peakEquity = config.startingCapital;

  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!bar) continue;

    // Apply transitions at the OPEN of the NEXT bar.
    if (i > 0) {
      const prevDesired = signals[i - 1] ?? "flat";
      if (prevDesired !== position) {
        if (prevDesired === "long" && position === "flat") {
          // Enter long at this bar's open.
          const equityAtOpen = cash + shares * bar.open;
          const fraction = kellyFraction(trades, config.maxPositionFraction);
          const dollars = equityAtOpen * fraction;
          const fillPrice = applySlippage(bar.open, slippageBps, "buy");
          const buyShares = Math.floor(dollars / fillPrice);
          if (buyShares > 0) {
            const cost = buyShares * fillPrice + buyShares * commission;
            if (cost <= cash) {
              cash -= cost;
              shares += buyShares;
              position = "long";
              entryPrice = fillPrice;
              entryDate = bar.date;
              entryBarIndex = i;
            }
          }
        } else if (prevDesired === "flat" && position === "long" && shares > 0) {
          // Exit long at this bar's open.
          const fillPrice = applySlippage(bar.open, slippageBps, "sell");
          const proceeds = shares * fillPrice - shares * commission;
          const costBasis = shares * entryPrice + shares * commission;
          const pnl = proceeds - costBasis;
          const returnPct = (fillPrice - entryPrice) / entryPrice;

          trades.push({
            entryDate,
            entryPrice,
            exitDate: bar.date,
            exitPrice: fillPrice,
            shares,
            pnl,
            returnPct,
            barsHeld: i - entryBarIndex + 1
          });

          cash += proceeds;
          shares = 0;
          position = "flat";
          entryPrice = 0;
          entryDate = "";
          entryBarIndex = -1;
        }
      }
    }

    const markToMarket = cash + shares * bar.close;
    if (markToMarket > peakEquity) peakEquity = markToMarket;
    const drawdown = peakEquity > 0 ? markToMarket / peakEquity - 1 : 0;
    equity.push({ date: bar.date, equity: markToMarket, drawdown });
  }

  // Force close any open position at the last bar's close.
  const lastBar = bars[bars.length - 1];
  if (position === "long" && shares > 0 && lastBar) {
    const fillPrice = applySlippage(lastBar.close, slippageBps, "sell");
    const proceeds = shares * fillPrice - shares * commission;
    const costBasis = shares * entryPrice + shares * commission;
    const pnl = proceeds - costBasis;
    const returnPct = (fillPrice - entryPrice) / entryPrice;
    trades.push({
      entryDate,
      entryPrice,
      exitDate: lastBar.date,
      exitPrice: fillPrice,
      shares,
      pnl,
      returnPct,
      barsHeld: bars.length - entryBarIndex
    });
    cash += proceeds;
    shares = 0;
    position = "flat";
    const final = equity[equity.length - 1];
    if (final) {
      if (cash > peakEquity) peakEquity = cash;
      final.equity = cash;
      final.drawdown = peakEquity > 0 ? cash / peakEquity - 1 : 0;
    }
  }

  const stats = computeStats(equity, trades, bars, config.startingCapital);

  return {
    symbol: "",
    strategy,
    params: { ...(params ?? {}) } as Record<string, number>,
    stats,
    equity,
    trades,
    signals,
    bars
  };
}

function validateBacktestInputs(bars: Bar[], config: BacktestConfig): void {
  if (!Number.isFinite(config.startingCapital) || config.startingCapital <= 0) {
    throw new Error("startingCapital must be a positive number");
  }
  if (
    !Number.isFinite(config.maxPositionFraction)
    || config.maxPositionFraction < 0
    || config.maxPositionFraction > 1
  ) {
    throw new Error("maxPositionFraction must be between 0 and 1");
  }
  if ((config.commissionPerShare ?? 0) < 0) {
    throw new Error("commissionPerShare cannot be negative");
  }
  if ((config.slippageBps ?? 0) < 0) {
    throw new Error("slippageBps cannot be negative");
  }

  let previousDate = "";
  for (const [index, bar] of bars.entries()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bar.date)) {
      throw new Error(`bar ${index} has an invalid ISO date`);
    }
    if (previousDate && bar.date <= previousDate) {
      throw new Error("bars must be sorted by ascending date with no duplicate dates");
    }
    previousDate = bar.date;

    const values = [bar.open, bar.high, bar.low, bar.close, bar.adjClose];
    if (values.some((value) => !Number.isFinite(value) || value <= 0)) {
      throw new Error(`bar ${bar.date} contains non-positive OHLC values`);
    }
    if (bar.volume < 0 || !Number.isFinite(bar.volume)) {
      throw new Error(`bar ${bar.date} contains invalid volume`);
    }
    if (bar.high < Math.max(bar.open, bar.close) || bar.low > Math.min(bar.open, bar.close)) {
      throw new Error(`bar ${bar.date} has inconsistent high/low values`);
    }
  }
}

function computeStats(
  equity: EquityPoint[],
  trades: Trade[],
  bars: Bar[],
  startingCapital: number
): BacktestStats {
  const first = equity[0];
  const last = equity[equity.length - 1];
  const firstBar = bars[0];
  const lastBar = bars[bars.length - 1];
  if (!first || !last || !firstBar || !lastBar) {
    throw new Error("Cannot compute stats from an empty equity curve");
  }

  const totalReturnPct = (last.equity - startingCapital) / startingCapital;
  const years = Math.max((bars.length - 1) / TRADING_DAYS_PER_YEAR, 1 / TRADING_DAYS_PER_YEAR);
  const annualizedReturnPct = Math.pow(1 + totalReturnPct, 1 / years) - 1;

  // Daily simple returns of the equity curve, used for Sharpe.
  const dailyReturns: number[] = [];
  for (let i = 1; i < equity.length; i++) {
    const prev = equity[i - 1];
    const cur = equity[i];
    if (prev && cur && prev.equity > 0) {
      dailyReturns.push((cur.equity - prev.equity) / prev.equity);
    }
  }
  const meanDaily = dailyReturns.reduce((s, r) => s + r, 0) / Math.max(dailyReturns.length, 1);
  const variance = dailyReturns.reduce((s, r) => s + (r - meanDaily) ** 2, 0) / Math.max(dailyReturns.length - 1, 1);
  const stdDaily = Math.sqrt(variance);
  // Risk free rate is approximated as zero. Annualize by sqrt(252).
  const sharpe = stdDaily > 0 ? (meanDaily / stdDaily) * Math.sqrt(TRADING_DAYS_PER_YEAR) : 0;

  let maxDrawdownPct = 0;
  for (const point of equity) {
    if (point.drawdown < maxDrawdownPct) maxDrawdownPct = point.drawdown;
  }

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const winRatePct = trades.length > 0 ? wins.length / trades.length : 0;
  const avgWinPct = wins.length > 0 ? wins.reduce((s, t) => s + t.returnPct, 0) / wins.length : 0;
  const avgLossPct = losses.length > 0 ? losses.reduce((s, t) => s + t.returnPct, 0) / losses.length : 0;

  let longestLosingStreak = 0;
  let currentStreak = 0;
  for (const t of trades) {
    if (t.pnl < 0) {
      currentStreak += 1;
      if (currentStreak > longestLosingStreak) longestLosingStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const buyHoldReturnPct = (lastBar.adjClose - firstBar.adjClose) / firstBar.adjClose;
  const buyHoldAnnualizedPct = Math.pow(1 + buyHoldReturnPct, 1 / years) - 1;

  return {
    startDate: firstBar.date,
    endDate: lastBar.date,
    startingCapital,
    endingEquity: last.equity,
    totalReturnPct,
    annualizedReturnPct,
    sharpe,
    maxDrawdownPct,
    winRatePct,
    trades: trades.length,
    avgWinPct,
    avgLossPct,
    longestLosingStreak,
    buyHoldReturnPct,
    buyHoldAnnualizedPct
  };
}
