"use client";

import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

type Point = { x: string; y: number };
export function CasesOverviewChart({ data }: { data: { open: Point[]; resolved: Point[] } }) {
  const merged = (data.open || []).map((p, i) => ({
    x: p.x,
    open: p.y,
    resolved: data.resolved?.[i]?.y ?? 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="open" stroke="#ef4444" dot={false} />
          <Line type="monotone" dataKey="resolved" stroke="#22c55e" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
