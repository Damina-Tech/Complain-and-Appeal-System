export async function getOverviewData() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  
  // Get token from cookies (server-side) - await cookies() in Next.js 15+
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!API_URL || !token) {
    // Return default values if API is not available
    return {
      totalCases: {
        value: 0,
        growthRate: 0,
      },
      totalCaseOwners: {
        value: 0,
        growthRate: 0,
      },
      totalSolvedCases: {
        value: 0,
        growthRate: 0,
      },
      totalPendingCases: {
        value: 0,
        growthRate: 0,
      },
    };
  }

  try {
    // Fetch summary data from API
    const summaryRes = await fetch(`${API_URL}/reports/summary/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!summaryRes.ok) {
      throw new Error(`Failed to fetch summary: ${summaryRes.status}`);
    }

    const summaryData = await summaryRes.json();

    // Fetch assignments to count unique case owners (users assigned to cases)
    let totalCaseOwners = 0;
    try {
      const assignmentsRes = await fetch(`${API_URL}/assignments/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        const assignments = Array.isArray(assignmentsData) 
          ? assignmentsData 
          : assignmentsData.results || [];
        
        // Count unique users who are assigned to cases
        const uniqueOwners = new Set<string>();
        assignments.forEach((assignment: any) => {
          if (assignment.to_user_id) {
            uniqueOwners.add(String(assignment.to_user_id));
          }
          if (assignment.to_user && typeof assignment.to_user === 'object' && assignment.to_user.id) {
            uniqueOwners.add(String(assignment.to_user.id));
          }
        });
        totalCaseOwners = uniqueOwners.size;
      }
    } catch (e) {
      // If assignments endpoint fails, try to get from cases
      try {
        const casesRes = await fetch(`${API_URL}/cases/`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (casesRes.ok) {
          const casesData = await casesRes.json();
          const cases = Array.isArray(casesData) ? casesData : casesData.results || [];
          const uniqueOwners = new Set<string>();
          cases.forEach((caseItem: any) => {
            if (caseItem.reported_by) {
              uniqueOwners.add(String(caseItem.reported_by));
            }
          });
          totalCaseOwners = uniqueOwners.size;
        }
      } catch (err) {
        console.error("Error fetching case owners:", err);
      }
    }

    // Get data from summary
    const totalCases = summaryData.total_cases || 0;
    const solvedCases = summaryData.resolved || 0;
    const pendingCases = summaryData.pending || 0;

    return {
      totalCases: {
        value: totalCases,
        growthRate: 0, // Calculate from previous period if needed
      },
      totalCaseOwners: {
        value: totalCaseOwners,
        growthRate: 0, // Calculate from previous period if needed
      },
      totalSolvedCases: {
        value: solvedCases,
        growthRate: 0, // Calculate from previous period if needed
      },
      totalPendingCases: {
        value: pendingCases,
        growthRate: 0, // Calculate from previous period if needed
      },
    };
  } catch (error) {
    console.error("Error fetching overview data:", error);
    // Return default values on error
    return {
      totalCases: {
        value: 0,
        growthRate: 0,
      },
      totalCaseOwners: {
        value: 0,
        growthRate: 0,
      },
      totalSolvedCases: {
        value: 0,
        growthRate: 0,
      },
      totalPendingCases: {
        value: 0,
        growthRate: 0,
      },
    };
  }
}

export async function getChatsData() {
  // Fake delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      name: "Jacob Jones",
      profile: "/images/user/user-01.png",
      isActive: true,
      lastMessage: {
        content: "See you tomorrow at the meeting!",
        type: "text",
        timestamp: "2024-12-19T14:30:00Z",
        isRead: false,
      },
      unreadCount: 3,
    },
    {
      name: "Wilium Smith",
      profile: "/images/user/user-03.png",
      isActive: true,
      lastMessage: {
        content: "Thanks for the update",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
    {
      name: "Johurul Haque",
      profile: "/images/user/user-04.png",
      isActive: false,
      lastMessage: {
        content: "What's up?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
    {
      name: "M. Chowdhury",
      profile: "/images/user/user-05.png",
      isActive: false,
      lastMessage: {
        content: "Where are you now?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 2,
    },
    {
      name: "Akagami",
      profile: "/images/user/user-07.png",
      isActive: false,
      lastMessage: {
        content: "Hey, how are you?",
        type: "text",
        timestamp: "2024-12-19T10:15:00Z",
        isRead: true,
      },
      unreadCount: 0,
    },
  ];
}