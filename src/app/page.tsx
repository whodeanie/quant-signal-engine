import Link from "next/link";
import { Disclaimer } from "@/components/Disclaimer";

const FEATURED = [
  {
    title: "Golden Cross on SPY",
    body: "The textbook trend follower applied to the S&P 500 ETF across COVID, the 2022 bear, and the 2023 to 2024 melt up.",
    href: "/backtest?symbol=SPY&strategy=ma_crossover&from=2020-01-01&to=2024-12-31"
  },
  {
    title: "RSI Mean Reversion on AAPL",
    body: "Buy oversold pullbacks in a high quality momentum name across the 2020 to 2024 window.",
    href: "/backtest?symbol=AAPL&strategy=rsi_mean_reversion&from=2020-01-01&to=2024-12-31"
  },
  {
    title: "Bollinger Breakout on NVDA",
    body: "Volatility breakout on the most explosive AI beneficiary across the 2022 bear into the 2024 boom.",
    href: "/backtest?symbol=NVDA&strategy=bollinger_breakout&from=2022-01-01&to=2024-12-31"
  }
];

export default function HomePage() {
  return (
    <div className="space-y-10 pt-10">
      <section className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Backtest trading signals on real data. <span className="text-signal-gold">Free.</span>
        </h1>
        <p className="muted max-w-2xl text-lg">
          Three classic quant strategies, walk forward simulation against historical OHLC data, full performance
          statistics, and AI generated commentary on what worked and what failed. Educational analytics. No trade
          execution.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/backtest" className="btn-primary">Run a backtest</Link>
          <Link href="/strategies" className="btn">Read the strategies</Link>
        </div>
        <Disclaimer compact />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Featured backtests</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURED.map((f) => (
            <Link href={f.href} key={f.title} className="card hover:border-signal-gold no-underline block">
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="muted text-sm">{f.body}</p>
              <p className="text-signal-gold text-sm mt-2">Run this backtest</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">What the engine does</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <h3 className="font-semibold mb-1">Three strategies</h3>
            <p className="muted text-sm">
              RSI mean reversion, moving average crossover, and Bollinger band breakout. Standard parameters by
              default, configurable per run.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-1">Walk forward simulation</h3>
            <p className="muted text-sm">
              Signals fire at the close of bar k, the portfolio transitions at the open of bar k plus one. No
              look ahead. Position size is set by capped Kelly.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-1">Honest statistics</h3>
            <p className="muted text-sm">
              Total and annualized return, Sharpe, max drawdown, win rate, average winning and losing trade,
              longest losing streak, plus buy and hold as the benchmark.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
