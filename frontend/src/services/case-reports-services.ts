// src/services/case-reports-services.ts
export type Point = { x: string; y: number };
export type Slice = { label: string; value: number };

// Helper function to get date range based on timeFrame
function getDateRange(timeFrame: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  switch (timeFrame) {
    case "daily":
      start.setDate(end.getDate() - 30); // Last 30 days
      break;
    case "weekly":
      start.setDate(end.getDate() - 84); // Last 12 weeks
      break;
    case "monthly":
      start.setMonth(end.getMonth() - 6); // Last 6 months
      break;
    case "yearly":
      start.setFullYear(end.getFullYear() - 2); // Last 2 years
      break;
    default:
      start.setMonth(end.getMonth() - 6); // Default to 6 months
  }
  
  return { start, end };
}

// Helper function to format date based on timeFrame
function formatDate(date: Date, timeFrame: string): string {
  switch (timeFrame) {
    case "daily":
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "weekly":
      // Get week number of the year
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    case "monthly":
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    case "yearly":
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
}

// Helper function to group cases by date
function groupCasesByDate(
  cases: any[],
  timeFrame: string
): { open: Point[]; resolved: Point[] } {
  const { start, end } = getDateRange(timeFrame);
  
  // Initialize buckets based on timeFrame
  const openMap = new Map<string, number>();
  const resolvedMap = new Map<string, number>();
  
  // Generate all date buckets in the range
  const allBuckets = new Set<string>();
  const currentDate = new Date(start);
  const endDate = new Date(end);
  
  while (currentDate <= endDate) {
    allBuckets.add(formatDate(new Date(currentDate), timeFrame));
    
    // Increment based on timeFrame
    switch (timeFrame) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
      default:
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }
  
  // Initialize all buckets to 0
  allBuckets.forEach((bucket) => {
    openMap.set(bucket, 0);
    resolvedMap.set(bucket, 0);
  });
  
  // Count cases in each bucket
  cases.forEach((caseItem) => {
    if (!caseItem.created_at) return;
    
    const caseDate = new Date(caseItem.created_at);
    if (caseDate < start || caseDate > end) return;
    
    const dateKey = formatDate(caseDate, timeFrame);
    const isOpen = !["resolved", "rejected", "closed"].includes(caseItem.status?.toLowerCase());
    const isResolved = caseItem.status?.toLowerCase() === "resolved";
    
    if (isOpen && openMap.has(dateKey)) {
      openMap.set(dateKey, (openMap.get(dateKey) || 0) + 1);
    }
    if (isResolved && resolvedMap.has(dateKey)) {
      resolvedMap.set(dateKey, (resolvedMap.get(dateKey) || 0) + 1);
    }
  });
  
  // Convert to arrays and sort by date
  const open: Point[] = Array.from(openMap.entries())
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => {
      // Try to parse as date for better sorting
      try {
        const dateA = new Date(a.x);
        const dateB = new Date(b.x);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
      } catch {
        // Fallback to string comparison
      }
      return a.x.localeCompare(b.x);
    });
  
  const resolved: Point[] = Array.from(resolvedMap.entries())
    .map(([x, y]) => ({ x, y }))
    .sort((a, b) => {
      try {
        const dateA = new Date(a.x);
        const dateB = new Date(b.x);
        if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
          return dateA.getTime() - dateB.getTime();
        }
      } catch {
        // Fallback to string comparison
      }
      return a.x.localeCompare(b.x);
    });
  
  return { open, resolved };
}

export async function getCasesOverviewData(
  timeFrame = "monthly"
): Promise<{ open: Point[]; resolved: Point[] }> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  
  // Get token from cookies (server-side) - await cookies() in Next.js 15+
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!API_URL || !token) {
    // Return empty data if API is not available
    return { open: [], resolved: [] };
  }

  try {
    // Fetch all cases (we'll filter by date on client side)
    const res = await fetch(`${API_URL}/cases/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch cases: ${res.status}`);
    }

    const data = await res.json();
    let cases = Array.isArray(data) ? data : data.results || [];

    // Handle pagination if needed
    if (data.next) {
      // Fetch all pages
      let nextUrl = data.next;
      while (nextUrl) {
        const nextRes = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });
        if (nextRes.ok) {
          const nextData = await nextRes.json();
          cases = cases.concat(Array.isArray(nextData) ? nextData : nextData.results || []);
          nextUrl = nextData.next || null;
        } else {
          break;
        }
      }
    }

    // Filter by date range
    const { start } = getDateRange(timeFrame);
    cases = cases.filter((caseItem: any) => {
      if (!caseItem.created_at) return false;
      const caseDate = new Date(caseItem.created_at);
      return caseDate >= start;
    });

    return groupCasesByDate(cases, timeFrame);
  } catch (error) {
    console.error("Error fetching cases overview data:", error);
    return { open: [], resolved: [] };
  }
}

export async function getCasesByCategoryData(
  timeFrame = "monthly"
): Promise<Slice[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  
  // Get token from cookies (server-side) - await cookies() in Next.js 15+
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!API_URL || !token) {
    return [];
  }

  try {
    // Apply date filter if needed
    const { start } = getDateRange(timeFrame);
    const startStr = start.toISOString().split("T")[0];

    const res = await fetch(
      `${API_URL}/reports/cases_by_category/?start=${startStr}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch cases by category: ${res.status}`);
    }

    const data = await res.json();
    const categoryData = Array.isArray(data) ? data : [];

    // Map category IDs to readable labels
    const categoryLabels: Record<string, string> = {
      land: "Land",
      education: "Education",
      infrastructure: "Infrastructure",
      healthcare: "Healthcare",
      "water & sanitation": "Water & Sanitation",
      "human right": "Human Right",
      other: "Other",
    };

    return categoryData
      .filter((item: { category: string; total: number }) => item.total > 0)
      .map((item: { category: string; total: number }) => ({
        label: categoryLabels[item.category] || item.category || "Other",
        value: item.total || 0,
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  } catch (error) {
    console.error("Error fetching cases by category data:", error);
    return [];
  }
}
