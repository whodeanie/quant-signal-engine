import { Suspense } from "react";
import BacktestForm from "./BacktestForm";

export const metadata = {
  title: "Backtest",
  description:
    "Run a walk forward backtest on any US listed symbol against three classic quant strategies. Free."
};

export default function BacktestPage() {
  return (
    <div className="space-y-6 pt-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Backtest</h1>
        <p className="muted">
          Pick a symbol, a strategy, a date range, and a starting capital. Position size is set by capped Kelly
          using realized trade history. Slippage and commissions default to zero.
        </p>
      </header>
      <Suspense fallback={<p className="muted">Loading...</p>}>
        <BacktestForm />
      </Suspense>
    </div>
  );
}
