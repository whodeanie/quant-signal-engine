import { NextResponse } from "next/server";
import { fetchBars } from "@/lib/marketData";
import { runBacktest } from "@/lib/backtester";
import { generateAICommentary } from "@/lib/aiCommentary";
import type { StrategyId } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STRATEGIES: StrategyId[] = ["rsi_mean_reversion", "ma_crossover", "bollinger_breakout"];

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      symbol?: string;
      strategy?: StrategyId;
      from?: string;
      to?: string;
      capital?: number;
      maxPositionFraction?: number;
      params?: Record<string, number>;
      withCommentary?: boolean;
    };

    const symbol = (body.symbol ?? "").trim().toUpperCase();
    const strategy = body.strategy;
    const from = body.from ?? "";
    const to = body.to ?? "";

    if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });
    if (!strategy || !VALID_STRATEGIES.includes(strategy)) {
      return NextResponse.json({ error: "strategy must be one of " + VALID_STRATEGIES.join(", ") }, { status: 400 });
    }
    if (!from || !to) return NextResponse.json({ error: "from and to are required (YYYY MM DD)" }, { status: 400 });
    if (new Date(from) >= new Date(to)) {
      return NextResponse.json({ error: "from must be before to" }, { status: 400 });
    }

    const capital = Math.max(100, Math.min(body.capital ?? 10000, 10_000_000));
    const maxPositionFraction = Math.max(0.05, Math.min(body.maxPositionFraction ?? 0.25, 1));

    const bars = await fetchBars(symbol, from, to);
    if (bars.length < 30) {
      return NextResponse.json({ error: "Not enough bars in this window. Try a longer date range." }, { status: 400 });
    }

    const result = runBacktest(bars, strategy, { startingCapital: capital, maxPositionFraction }, body.params);
    result.symbol = symbol;

    let commentary = null;
    if (body.withCommentary !== false) {
      commentary = await generateAICommentary(result, symbol);
    }

    // Strip the heavy bars and signals arrays from the public payload to keep
    // the response light. Charts only need the equity curve and trade log.
    const { bars: _bars, signals: _signals, ...lite } = result;

    return NextResponse.json({ result: lite, commentary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[/api/backtest]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
