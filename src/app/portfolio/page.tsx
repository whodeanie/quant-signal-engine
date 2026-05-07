import PortfolioClient from "./PortfolioClient";

export const metadata = {
  title: "Paper portfolio",
  description:
    "Track a hypothetical portfolio that follows the engine's signals. No real trades. Saved in your browser."
};

export default function PortfolioPage() {
  return (
    <div className="space-y-6 pt-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Paper portfolio</h1>
        <p className="muted max-w-2xl">
          A simple paper trading dashboard. Pick a starting capital and a basket of (symbol, strategy) signal
          subscriptions. The page tracks a hypothetical equity curve from the start date forward, marked to
          market against fresh OHLC. Saved to localStorage. No auth, no execution, no broker.
        </p>
      </header>
      <PortfolioClient />
    </div>
  );
}
