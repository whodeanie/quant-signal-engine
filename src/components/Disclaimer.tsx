export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="disclaimer">
        Educational analytics. Not financial advice. No trade execution. Past performance does not predict
        future results.
      </p>
    );
  }
  return (
    <div className="disclaimer space-y-2">
      <p>
        <strong>Educational analytics tool. NOT financial advice.</strong>
      </p>
      <ul className="list-disc list-inside space-y-1 text-ink-200">
        <li>Backtest results carry look ahead and survivorship bias. Treat as illustrative only.</li>
        <li>This tool does not execute trades and is not connected to any brokerage.</li>
        <li>Slippage, commissions, taxes, and borrow costs degrade real returns below backtested ones.</li>
        <li>Past performance does not predict future results.</li>
      </ul>
    </div>
  );
}
