import type { BacktestStats } from "@/lib/types";
import { fmtPct, fmtUsd, fmtNumber, statColor } from "@/lib/format";

export function StatsGrid({ stats }: { stats: BacktestStats }) {
  const cards: { label: string; value: string; tone?: string }[] = [
    { label: "Total return", value: fmtPct(stats.totalReturnPct), tone: statColor(stats.totalReturnPct) },
    {
      label: "Annualized",
      value: fmtPct(stats.annualizedReturnPct),
      tone: statColor(stats.annualizedReturnPct)
    },
    { label: "Sharpe", value: fmtNumber(stats.sharpe), tone: statColor(stats.sharpe) },
    {
      label: "Max drawdown",
      value: fmtPct(stats.maxDrawdownPct),
      tone: "text-signal-bear"
    },
    { label: "Win rate", value: fmtPct(stats.winRatePct) },
    { label: "Trades", value: fmtNumber(stats.trades, 0) },
    { label: "Avg win", value: fmtPct(stats.avgWinPct), tone: "text-signal-bull" },
    { label: "Avg loss", value: fmtPct(stats.avgLossPct), tone: "text-signal-bear" },
    { label: "Longest losing streak", value: fmtNumber(stats.longestLosingStreak, 0) },
    { label: "Ending equity", value: fmtUsd(stats.endingEquity) },
    {
      label: "Buy and hold",
      value: fmtPct(stats.buyHoldReturnPct),
      tone: statColor(stats.buyHoldReturnPct)
    },
    {
      label: "Buy and hold (annualized)",
      value: fmtPct(stats.buyHoldAnnualizedPct),
      tone: statColor(stats.buyHoldAnnualizedPct)
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div className="kpi" key={c.label}>
          <div className="kpi-label">{c.label}</div>
          <div className={`kpi-value ${c.tone ?? ""}`}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}
