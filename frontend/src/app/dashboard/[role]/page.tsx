import { Suspense } from "react";
import { PaymentsOverview } from "@/components/Charts/payments-overview";
import { UsedDevices } from "@/components/Charts/used-devices";
import { WeeksProfit } from "@/components/Charts/weeks-profit";
import { TopChannels } from "@/components/Tables/top-channels";
import { TopChannelsSkeleton } from "@/components/Tables/top-channels/skeleton";
import { OverviewCardsGroup } from "@/app/(home)/_components/overview-cards";
import { OverviewCardsSkeleton } from "@/app/(home)/_components/overview-cards/skeleton";
import { ChatsCard } from "@/app/(home)/_components/chats-card";
import { RegionLabels } from "@/app/(home)/_components/region-labels";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";

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

  // Simple role-based section toggles (customize as needed)
  const isCitizen = /citizen/i.test(role);
  const isFocal = /focal/i.test(role);
  const isDirector = /director/i.test(role);
  const isPresident = /president/i.test(role);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{roleTitle} Dashboard</h1>
        <p className="text-gray-600 dark:text-dark-6">Role: {roleTitle}</p>
      </div>

      <Suspense fallback={<OverviewCardsSkeleton />}>
        <OverviewCardsGroup />
      </Suspense>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        {/* Common widgets */}
        <PaymentsOverview
          className="col-span-12 xl:col-span-7"
          key={extract("payments_overview")}
          timeFrame={extract("payments_overview")?.split(":")[1]}
        />
        <WeeksProfit
          key={extract("weeks_profit")}
          timeFrame={extract("weeks_profit")?.split(":")[1]}
          className="col-span-12 xl:col-span-5"
        />
        <UsedDevices
          className="col-span-12 xl:col-span-5"
          key={extract("used_devices")}
          timeFrame={extract("used_devices")?.split(":")[1]}
        />
        <RegionLabels />

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
            <TopChannels />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <ChatsCard />
        </Suspense>
      </div>
    </>
  );
}


