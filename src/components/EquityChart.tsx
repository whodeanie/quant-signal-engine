"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import type { EquityPoint } from "@/lib/types";

type Props = {
  equity: EquityPoint[];
  startingCapital: number;
};

export function EquityChart({ equity, startingCapital }: Props) {
  const data = equity.map((p) => ({ date: p.date, equity: Math.round(p.equity), drawdown: p.drawdown }));
  return (
    <div className="card">
      <h3 className="font-semibold mb-2">Equity curve</h3>
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#262d3c" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: "#a8b1bf", fontSize: 12 }} minTickGap={32} />
            <YAxis tick={{ fill: "#a8b1bf", fontSize: 12 }} domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{ background: "#171c28", border: "1px solid #3a4254", color: "#f6f7f9" }}
              formatter={(v: number) => [`$${v.toLocaleString()}`, "Equity"]}
            />
            <ReferenceLine y={startingCapital} stroke="#7a8499" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="equity" stroke="#D4A574" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
