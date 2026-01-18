import { CasesOverview } from "@/components/Charts/cases-overview";
import { CasesByCategory } from "@/components/Charts/cases-by-category";
import { TopSources } from "@/components/Tables/top-sources";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { Suspense } from "react";
import { ChatsCard } from "./_components/chats-card";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { OverviewCardsSkeleton } from "./_components/overview-cards/skeleton";
import { RegionLabels } from "./_components/region-labels";

type PropsType = {
  searchParams: Promise<{
    selected_time_frame?: string;
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const { selected_time_frame } = await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);

  return (
    <>
      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup />
      </Suspense>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <CasesOverview
          className="col-span-12 xl:col-span-7"
          key={extractTimeFrame("cases_overview")}
          timeFrame={extractTimeFrame("cases_overview")?.split(":")[1]}
        />

        <CasesByCategory
          className="col-span-12 xl:col-span-5"
          key={extractTimeFrame("cases_by_category")}
          timeFrame={extractTimeFrame("cases_by_category")?.split(":")[1]}
        />

        <RegionLabels />

        <div className="col-span-12 grid xl:col-span-8">
          <TopSources />
        </div>

        <Suspense fallback={null}>
          <ChatsCard />
        </Suspense>
      </div>
    </>
  );
}
