// Display formatting helpers used across the UI.

export function fmtPct(n: number, digits: number = 2): string {
  if (!Number.isFinite(n)) return "n/a";
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtUsd(n: number, digits: number = 0): string {
  if (!Number.isFinite(n)) return "n/a";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits });
}

export function fmtNumber(n: number, digits: number = 2): string {
  if (!Number.isFinite(n)) return "n/a";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtDate(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function statColor(n: number): string {
  if (n > 0) return "text-signal-bull";
  if (n < 0) return "text-signal-bear";
  return "text-ink-300";
}
