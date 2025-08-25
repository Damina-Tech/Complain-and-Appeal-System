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
  const extract = createTimeFrameExtractor(selected_time_frame);

  const roleTitle = toTitleCase(role);

  // If citizen role hits dashboard route, redirect to default route (/cases)
  if (/citizen/i.test(role)) {
    redirect("/cases");
  }

  const isCitizen = /citizen/i.test(role);
  const isFocal = /focal/i.test(role);
  const isDirector = /director/i.test(role);
  const isPresident = /president/i.test(role);

  return (
    <>
      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup />
      </Suspense>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        {/* Complaint/Appeal widgets */}
        <CasesOverview
          className="col-span-12 xl:col-span-7"
          key={extract("cases_overview")}
          timeFrame={extract("cases_overview")?.split(":")[1]}
        />

        <CasesByCategory
          className="col-span-12 xl:col-span-5"
          key={extract("cases_by_category")}
          timeFrame={extract("cases_by_category")?.split(":")[1]}
        />

        {/* Role-specific sections (examples) */}
        {isCitizen && (
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 p-6 dark:border-dark-3">
              <h2 className="mb-2 text-xl font-semibold">My Recent Cases</h2>
              <p className="text-gray-600 dark:text-dark-6">
                Citizen-focused summary. Hook this up to your cases API.
              </p>
            </div>
          </div>
        )}

        {isFocal && (
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 p-6 dark:border-dark-3">
              <h2 className="mb-2 text-xl font-semibold">Assignments Queue</h2>
              <p className="text-gray-600 dark:text-dark-6">
                Worklist and transfers for focal users.
              </p>
            </div>
          </div>
        )}

        {(isDirector || isPresident) && (
          <div className="col-span-12">
            <div className="rounded-lg border border-gray-200 p-6 dark:border-dark-3">
              <h2 className="mb-2 text-xl font-semibold">Executive Insights</h2>
              <p className="text-gray-600 dark:text-dark-6">
                High-level KPIs and escalations for leadership.
              </p>
            </div>
          </div>
        )}

        {/* Common table/cards */}
        <div className="col-span-12 grid xl:col-span-8">
          <Suspense fallback={<TopChannelsSkeleton />}>
            <TopSources />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ChatsCard />
        </Suspense>
      </div>
    </>
  );
}
