// AI commentary generator.
//
// When GROQ_API_KEY is set, sends a compact summary of the backtest result to
// Llama 3.3 70B via Groq's OpenAI compatible endpoint and asks for a one
// paragraph regime aware analysis. When the key is missing, returns a
// deterministic template paragraph so the page never breaks.

import OpenAI from "openai";
import type { AICommentary, BacktestResult } from "./types";
import { STRATEGY_META } from "./strategies";

function pct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function describeBuyHoldComparison(result: BacktestResult): string {
  const stratReturn = result.stats.totalReturnPct;
  const bhReturn = result.stats.buyHoldReturnPct;
  const diff = stratReturn - bhReturn;
  if (Math.abs(diff) < 0.01) return "in line with buy and hold";
  return diff > 0
    ? `${pct(diff)} above buy and hold over the same window`
    : `${pct(-diff)} below buy and hold over the same window`;
}

function deterministicCommentary(result: BacktestResult, symbol: string): string {
  const meta = STRATEGY_META[result.strategy];
  const s = result.stats;
  const verdict = describeBuyHoldComparison(result);
  const sharpeText = s.sharpe >= 1 ? "respectable" : s.sharpe >= 0 ? "modest" : "negative";
  return [
    `${meta.name} on ${symbol} between ${s.startDate} and ${s.endDate} produced a total return of ${pct(s.totalReturnPct)}, ${verdict}.`,
    `Annualized return was ${pct(s.annualizedReturnPct)} with a Sharpe ratio of ${s.sharpe.toFixed(2)}, which is ${sharpeText} risk adjusted performance.`,
    `Across ${s.trades} closed trades the win rate landed at ${pct(s.winRatePct)} with the longest losing streak running ${s.longestLosingStreak} trades and the worst peak to trough drawdown reaching ${pct(s.maxDrawdownPct)}.`,
    `${meta.blurb}`
  ].join(" ");
}

export async function generateAICommentary(result: BacktestResult, symbol: string): Promise<AICommentary> {
  const apiKey = process.env.GROQ_API_KEY;
  const fallback: AICommentary = {
    paragraph: deterministicCommentary(result, symbol),
    fromModel: false
  };

  if (!apiKey) return fallback;

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.groq.com/openai/v1"
    });

    const meta = STRATEGY_META[result.strategy];
    const s = result.stats;
    const summary = {
      symbol,
      strategy: meta.name,
      window: `${s.startDate} to ${s.endDate}`,
      starting_capital: s.startingCapital,
      ending_equity: Math.round(s.endingEquity),
      total_return_pct: +(s.totalReturnPct * 100).toFixed(2),
      annualized_return_pct: +(s.annualizedReturnPct * 100).toFixed(2),
      sharpe: +s.sharpe.toFixed(2),
      max_drawdown_pct: +(s.maxDrawdownPct * 100).toFixed(2),
      win_rate_pct: +(s.winRatePct * 100).toFixed(2),
      trades: s.trades,
      avg_win_pct: +(s.avgWinPct * 100).toFixed(2),
      avg_loss_pct: +(s.avgLossPct * 100).toFixed(2),
      longest_losing_streak: s.longestLosingStreak,
      buy_hold_return_pct: +(s.buyHoldReturnPct * 100).toFixed(2),
      buy_hold_annualized_pct: +(s.buyHoldAnnualizedPct * 100).toFixed(2)
    };

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 360,
      messages: [
        {
          role: "system",
          content:
            "You are a sober quantitative analyst writing one paragraph of plain English commentary on a backtest result. Avoid hype. Be specific about what worked and what failed. Mention regime context (bull, bear, range bound, high volatility) when relevant. Never claim the strategy will work going forward. Never use em dashes, en dashes, or sentence break hyphens. Keep it to four to six sentences."
        },
        {
          role: "user",
          content: `Write a single paragraph of analysis for this backtest result. Reference the buy and hold comparison.\n\n${JSON.stringify(summary, null, 2)}`
        }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) return fallback;
    return { paragraph: text, fromModel: true };
  } catch (err) {
    console.warn("[aiCommentary] Groq failed, falling back to deterministic copy:", err);
    return fallback;
  }
}
