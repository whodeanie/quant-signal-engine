import Link from "next/link";

export const metadata = {
  title: "Strategies",
  description: "How each of the three signal strategies work, the math, when they shine, when they suffer."
};

const STRATEGIES = [
  {
    id: "rsi_mean_reversion",
    name: "RSI Mean Reversion",
    summary: "Buy oversold dips, exit on overbought rallies.",
    math: [
      "Compute the 14 period Wilder smoothed Relative Strength Index over the close series.",
      "RSI rises toward 100 as average gains dominate average losses, falls toward 0 in the opposite case.",
      "Convention: RSI under 30 marks oversold conditions, RSI over 70 marks overbought."
    ],
    rules: [
      "Position is flat by default.",
      "Enter long when RSI crosses below 30.",
      "Exit back to flat when RSI crosses above 70."
    ],
    works: [
      "Range bound or mean reverting tape.",
      "High quality names that pull back without breaking trend.",
      "Risk on regimes where dip buyers consistently get rewarded."
    ],
    fails: [
      "Strong sustained downtrends. RSI can stay under 30 for weeks while price keeps falling.",
      "Crash regimes (March 2020, October 2008). Mean reversion is a leveraged short volatility trade in disguise.",
      "Low volume or illiquid names where the indicator gets noisy."
    ],
    code: `import { rsi } from "@/lib/indicators";

const closes = bars.map((b) => b.adjClose);
const rsiVals = rsi(closes, 14);

let position = "flat";
const targets = bars.map((_, i) => {
  const r = rsiVals[i];
  if (Number.isFinite(r)) {
    if (position === "flat" && r < 30) position = "long";
    else if (position === "long" && r > 70) position = "flat";
  }
  return position;
});`
  },
  {
    id: "ma_crossover",
    name: "Moving Average Crossover",
    summary: "Hold during the golden cross regime, flat during the death cross.",
    math: [
      "Compute two simple moving averages of the close: a fast 50 day SMA and a slow 200 day SMA.",
      "When the fast crosses above the slow, the market is in a golden cross regime.",
      "When the fast crosses below the slow, the market is in a death cross regime."
    ],
    rules: [
      "Hold long whenever fast > slow, including the bar of the cross.",
      "Hold flat (cash) whenever fast <= slow.",
      "No leverage, no shorting in this baseline implementation."
    ],
    works: [
      "Persistent trends. The 2010 to 2018 SPY bull run is the canonical case.",
      "Asset classes with momentum like equity indices, commodities in regime, large cap tech leaders.",
      "Risk reduction during deep bear markets, by sitting out under the death cross."
    ],
    fails: [
      "Choppy or sideways markets. The crossover whipsaws and bleeds capital on round trip costs.",
      "Single name idiosyncratic shocks. The strategy is slow to react and slow to exit.",
      "Frequent regime changes (1970s style stagflation tape)."
    ],
    code: `import { sma } from "@/lib/indicators";

const closes = bars.map((b) => b.adjClose);
const fast = sma(closes, 50);
const slow = sma(closes, 200);

const targets = bars.map((_, i) => {
  const f = fast[i];
  const s = slow[i];
  if (Number.isFinite(f) && Number.isFinite(s)) {
    return f > s ? "long" : "flat";
  }
  return "flat";
});`
  },
  {
    id: "bollinger_breakout",
    name: "Bollinger Band Breakout",
    summary: "Buy 2 standard deviation upside breakouts, exit at the SMA mean.",
    math: [
      "Compute a 20 day SMA of the close as the middle band.",
      "Compute the 20 day rolling standard deviation of the close.",
      "Upper band = middle + 2 stdev. Lower band = middle minus 2 stdev."
    ],
    rules: [
      "Enter long when the close pierces above the upper band.",
      "Exit back to flat when the close drops back through the middle band.",
      "The middle band exit is intentional. Exiting on the lower band overstays losing breakouts."
    ],
    works: [
      "Volatility expansion regimes. NVDA in 2023, Bitcoin in late 2020, oil in early 2022.",
      "Breakout markets from extended consolidations.",
      "Liquid large caps where the band math is not corrupted by gappy prints."
    ],
    fails: [
      "Choppy mean reverting tape. Every breakout snaps back, ringing the entry and exit on consecutive bars.",
      "Low volatility regimes. The bands compress, then a single noisy bar fires a fake breakout.",
      "News driven gap risk. Breakouts at the open often reverse intraday."
    ],
    code: `import { bollinger } from "@/lib/indicators";

const closes = bars.map((b) => b.adjClose);
const { upper, middle } = bollinger(closes, 20, 2);

let position = "flat";
const targets = bars.map((_, i) => {
  const c = closes[i];
  const u = upper[i];
  const m = middle[i];
  if (Number.isFinite(u) && Number.isFinite(m)) {
    if (position === "flat" && c > u) position = "long";
    else if (position === "long" && c < m) position = "flat";
  }
  return position;
});`
  }
];

export default function StrategiesPage() {
  return (
    <div className="space-y-10 pt-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">The strategies</h1>
        <p className="muted max-w-2xl">
          Three classic systematic strategies. The math is short, the parameters are standard, and the failure
          modes are real. Pick a backtest window long enough to span at least one bull market and one bear
          market before drawing conclusions.
        </p>
      </header>

      {STRATEGIES.map((s) => (
        <section key={s.id} className="space-y-3 border-t border-ink-700 pt-8">
          <h2 className="text-2xl font-semibold">{s.name}</h2>
          <p className="muted">{s.summary}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-2">Math</h3>
              <ul className="list-disc list-inside space-y-1 text-sm muted">
                {s.math.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-2">Rules</h3>
              <ul className="list-disc list-inside space-y-1 text-sm muted">
                {s.rules.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-semibold mb-2">When it shines / suffers</h3>
              <p className="text-sm text-signal-bull mb-1">Works:</p>
              <ul className="list-disc list-inside space-y-1 text-sm muted mb-2">
                {s.works.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
              <p className="text-sm text-signal-bear mb-1">Fails:</p>
              <ul className="list-disc list-inside space-y-1 text-sm muted">
                {s.fails.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          <details className="card">
            <summary className="cursor-pointer font-semibold">Reference implementation</summary>
            <pre className="mt-2 overflow-x-auto text-xs leading-relaxed font-mono bg-ink-900 p-3 rounded">
              <code>{s.code}</code>
            </pre>
          </details>

          <Link href={`/backtest?strategy=${s.id}`} className="btn-primary inline-flex">
            Backtest {s.name}
          </Link>
        </section>
      ))}
    </div>
  );
}
