// src/components/Tables/top-sources/fetch.ts

type UIMetric = {
  name: "Walk-in" | "Phone" | "Web";
  submissions: number;
  resolvedPct: number; // 0..100
  avgDays: number;     // average resolution time in days
};

// 🔒 Mock only (ignore API for now)
const mockTopSources: UIMetric[] = [
  // Adjust numbers to feel realistic
  { name: "Walk-in", submissions: 210, resolvedPct: 76, avgDays: 4.2 },
  { name: "Phone",   submissions: 165, resolvedPct: 81, avgDays: 3.5 },
  { name: "Web",     submissions: 320, resolvedPct: 72, avgDays: 3.0 },
];

export async function getTopSources(): Promise<UIMetric[]> {
  // Simulate async
  return Promise.resolve(mockTopSources);
}
