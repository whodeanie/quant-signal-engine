"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { EquityPoint } from "@/lib/types";

export function DrawdownChart({ equity }: { equity: EquityPoint[] }) {
  const data = equity.map((p) => ({ date: p.date, drawdown: +(p.drawdown * 100).toFixed(2) }));
  return (
    <div className="card">
      <h3 className="font-semibold mb-2">Drawdown</h3>
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#262d3c" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#a8b1bf", fontSize: 12 }} minTickGap={32} />
            <YAxis tick={{ fill: "#a8b1bf", fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "#171c28", border: "1px solid #3a4254", color: "#f6f7f9" }}
              formatter={(v: number) => [`${v}%`, "Drawdown"]}
            />
            <Area type="monotone" dataKey="drawdown" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
