"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type Slice = { label: string; value: number };

// Fixed color mapping per category; add more as needed
const COLOR_MAP: Record<string, string> = {
  Infrastructure: "#5750F1",      // brand-ish purple
  Healthcare: "#22C55E",          // green
  Education: "#F59E0B",           // amber
  "Water & Sanitation": "#0EA5E9",// sky
  Other: "#EF4444",               // red
};

// Fallback palette if new categories appear
const PALETTE = ["#6366F1", "#10B981", "#F59E0B", "#3B82F6", "#EF4444", "#14B8A6", "#8B5CF6"];

export function CasesByCategoryDonut({ data }: { data: Slice[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={60} outerRadius={90} dataKey="value" nameKey="label">
            {data.map((d, i) => {
              const color = COLOR_MAP[d.label] ?? PALETTE[i % PALETTE.length];
              return <Cell key={`${d.label}-${i}`} fill={color} />;
            })}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
