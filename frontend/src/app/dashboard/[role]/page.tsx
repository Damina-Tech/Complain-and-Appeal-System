import { Suspense } from "react";
import { CasesOverview } from "@/components/Charts/cases-overview";           // ✅ named export
import { CasesByCategory } from "@/components/Charts/cases-by-category";     // ✅ named export
import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { OverviewCardsGroup } from "@/app/(home)/_components/overview-cards";
import { OverviewCardsSkeleton } from "@/app/(home)/_components/overview-cards/skeleton";
import { ChatsCard } from "@/app/(home)/_components/chats-card";
import { RegionLabels } from "@/app/(home)/_components/region-labels";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { redirect } from "next/navigation";
import { TopSources } from "@/components/Tables/top-sources";

type PropsType = {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ selected_time_frame?: string }>;
};

function toTitleCase(input: string) {
  return input.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function RoleDashboardPage({ params, searchParams }: PropsType) {
  const { role } = await params;
  const { selected_time_frame } = await searchParams;
  // Immediately redirect to clean URLs without exposing role
  if (/citizen/i.test(role)) {
    redirect("/cases");
  }
  redirect("/dashboard");
}
