import type { Trade } from "@/lib/types";
import { fmtDate, fmtPct, fmtUsd, statColor } from "@/lib/format";

export function TradeTable({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-2">Trade log</h3>
        <p className="muted">The strategy never opened a position in this window.</p>
      </div>
    );
  }
  return (
    <div className="card overflow-x-auto">
      <h3 className="font-semibold mb-2">Trade log ({trades.length})</h3>
      <table className="w-full text-sm">
        <thead className="text-ink-400 border-b border-ink-700">
          <tr>
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Entry</th>
            <th className="text-left py-2 px-2">Exit</th>
            <th className="text-right py-2 px-2">In</th>
            <th className="text-right py-2 px-2">Out</th>
            <th className="text-right py-2 px-2">Bars</th>
            <th className="text-right py-2 px-2">Return</th>
            <th className="text-right py-2 px-2">PnL</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t, i) => (
            <tr key={`${t.entryDate}-${i}`} className="border-b border-ink-800">
              <td className="py-1.5 px-2 text-ink-400">{i + 1}</td>
              <td className="py-1.5 px-2">{fmtDate(t.entryDate)}</td>
              <td className="py-1.5 px-2">{fmtDate(t.exitDate)}</td>
              <td className="py-1.5 px-2 text-right font-mono">${t.entryPrice.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right font-mono">${t.exitPrice.toFixed(2)}</td>
              <td className="py-1.5 px-2 text-right font-mono">{t.barsHeld}</td>
              <td className={`py-1.5 px-2 text-right font-mono ${statColor(t.returnPct)}`}>{fmtPct(t.returnPct)}</td>
              <td className={`py-1.5 px-2 text-right font-mono ${statColor(t.pnl)}`}>{fmtUsd(t.pnl)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
