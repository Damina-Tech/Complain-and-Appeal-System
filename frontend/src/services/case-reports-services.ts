// src/services/case-reports-services.ts
export type Point = { x: string; y: number };
export type Slice = { label: string; value: number };

// ---- MOCKS ONLY ----
const mockOverviewMonthly = {
  open: [
    { x: "Jan", y: 42 },
    { x: "Feb", y: 51 },
    { x: "Mar", y: 63 },
    { x: "Apr", y: 58 },
    { x: "May", y: 72 },
    { x: "Jun", y: 61 },
  ],
  resolved: [
    { x: "Jan", y: 18 },
    { x: "Feb", y: 25 },
    { x: "Mar", y: 31 },
    { x: "Apr", y: 39 },
    { x: "May", y: 47 },
    { x: "Jun", y: 55 },
  ],
};

const mockByCategory: Slice[] = [
  { label: "Infrastructure",      value: 120 },
  { label: "Healthcare",          value: 95 },
  { label: "Education",           value: 80 },
  { label: "Water & Sanitation",  value: 60 },
  { label: "Other",               value: 35 },
];

// Always return mocks for now
export async function getCasesOverviewData(
  _timeFrame = "monthly"
): Promise<{ open: Point[]; resolved: Point[] }> {
  return Promise.resolve(mockOverviewMonthly);
}

export async function getCasesByCategoryData(
  _timeFrame = "monthly"
): Promise<Slice[]> {
  return Promise.resolve(mockByCategory);
}
