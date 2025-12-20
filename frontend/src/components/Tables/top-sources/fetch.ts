// src/components/Tables/top-sources/fetch.ts

type UIMetric = {
  name: string;
  submissions: number;
  resolvedPct: number; // 0..100
  avgDays: number;     // average resolution time in days
};

// Map channel values to display names
const channelLabels: Record<string, string> = {
  web: "Web",
  walk_in: "Walk-in",
  phone: "Phone",
};

export async function getTopSources(): Promise<UIMetric[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  
  // Get token from cookies (server-side) - await cookies() in Next.js 15+
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!API_URL || !token) {
    return [];
  }

  try {
    // Fetch all cases
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
    const cases = Array.isArray(data) ? data : data.results || [];

    // Group cases by channel
    const channelStats = new Map<
      string,
      { total: number; resolved: number; resolutionDays: number[] }
    >();

    cases.forEach((caseItem: any) => {
      const channel = caseItem.channel || "web";
      const channelName = channelLabels[channel] || channel;

      if (!channelStats.has(channelName)) {
        channelStats.set(channelName, {
          total: 0,
          resolved: 0,
          resolutionDays: [],
        });
      }

      const stats = channelStats.get(channelName)!;
      stats.total += 1;

      if (caseItem.status?.toLowerCase() === "resolved") {
        stats.resolved += 1;

        // Calculate resolution time if status_history exists
        if (caseItem.status_history && Array.isArray(caseItem.status_history)) {
          const createdDate = new Date(caseItem.created_at);
          const resolvedEntry = caseItem.status_history.find(
            (h: any) => h.status?.toLowerCase() === "resolved"
          );
          
          if (resolvedEntry && resolvedEntry.changed_at) {
            const resolvedDate = new Date(resolvedEntry.changed_at);
            const daysDiff =
              (resolvedDate.getTime() - createdDate.getTime()) /
              (1000 * 60 * 60 * 24);
            if (daysDiff > 0) {
              stats.resolutionDays.push(daysDiff);
            }
          }
        }
      }
    });

    // Convert to UI format
    const metrics: UIMetric[] = Array.from(channelStats.entries())
      .map(([name, stats]) => {
        const resolvedPct =
          stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
        const avgDays =
          stats.resolutionDays.length > 0
            ? stats.resolutionDays.reduce((a, b) => a + b, 0) /
              stats.resolutionDays.length
            : 0;

        return {
          name,
          submissions: stats.total,
          resolvedPct,
          avgDays: Math.round(avgDays * 10) / 10, // Round to 1 decimal
        };
      })
      .sort((a, b) => b.submissions - a.submissions); // Sort by submissions descending

    return metrics;
  } catch (error) {
    console.error("Error fetching top sources data:", error);
    return [];
  }
}
