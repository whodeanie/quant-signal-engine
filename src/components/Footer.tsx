export function Footer() {
  return (
    <footer className="border-t border-ink-700 mt-16">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-300 space-y-2">
        <p>
          <strong className="text-ink-50">Educational analytics tool. NOT financial advice.</strong> Past
          performance does not predict future results.
        </p>
        <p>
          Backtested results have known biases such as look ahead and survivorship. Treat them as illustrative,
          not predictive.
        </p>
        <p>
          This tool DOES NOT execute trades. Any trading decisions are yours. Read the SEC retail investor
          guidance at{" "}
          <a href="https://www.investor.gov" target="_blank" rel="noreferrer" className="text-signal-gold">
            investor.gov
          </a>{" "}
          before risking real capital.
        </p>
        <p className="subtle">
          Built by <a href="https://github.com/whodeanie" target="_blank" rel="noreferrer">whodeanie</a>. Open
          source, MIT.
        </p>
      </div>
    </footer>
  );
}
