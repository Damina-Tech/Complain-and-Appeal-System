import { Suspense } from "react";
import { CasesOverview } from "@/components/Charts/cases-overview";
import { CasesByCategory } from "@/components/Charts/cases-by-category";
import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { OverviewCardsGroup } from "@/app/(home)/_components/overview-cards";
import { OverviewCardsSkeleton } from "@/app/(home)/_components/overview-cards/skeleton";
import { ChatsCard } from "@/app/(home)/_components/chats-card";
import { RegionLabels } from "@/app/(home)/_components/region-labels";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { redirect } from "next/navigation";
import { TopSources } from "@/components/Tables/top-sources"; // (you import it, add/use it if needed)

type PropsType = {
  params: Promise<{ role?: string }>;
  searchParams: Promise<{ selected_time_frame?: string }>;
};

function toTitleCase(input?: string) {
  const s = input ?? "";
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function RoleDashboardPage({ params, searchParams }: PropsType) {
  const { role } = await params;
  const { selected_time_frame } = await searchParams;

  const extract = createTimeFrameExtractor(selected_time_frame);
  const roleTitle = toTitleCase(role); // now safe even if role is undefined

  // If this page is meant to be used only with a role param, you can decide what to do when it's missing:
  // Example: redirect to a default dashboard
  if (!role) {
    // If your route is /dashboard (no role), keep user here; otherwise, choose a sensible default:
    // redirect("/dashboard");
  }

  // Only redirect citizens when role is actually present
  if (role && /citizen/i.test(role)) {
    redirect("/cases");
  }

  const isCitizen = !!role && /citizen/i.test(role);
  const isFocal = !!role && /focal/i.test(role);
  const isDirector = !!role && /director/i.test(role);
  const isPresident = !!role && /president/i.test(role);

  return (
    <>
      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup />
      </Suspense>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
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

        {/* <RegionLabels /> */}

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
