import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-ink-700 bg-ink-900/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight no-underline hover:no-underline">
          <span className="text-signal-gold">Quant</span>
          <span className="text-ink-50"> Signal Engine</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/backtest" className="muted hover:text-ink-50">Backtest</Link>
          <Link href="/strategies" className="muted hover:text-ink-50">Strategies</Link>
          <Link href="/portfolio" className="muted hover:text-ink-50">Paper</Link>
          <a
            href="https://github.com/whodeanie/quant-signal-engine"
            target="_blank"
            rel="noreferrer"
            className="muted hover:text-ink-50"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
