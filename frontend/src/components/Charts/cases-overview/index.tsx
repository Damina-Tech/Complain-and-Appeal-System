import { PeriodPicker } from "@/components/period-picker";
import { standardFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import { getCasesOverviewData } from "@/services/case-reports-services"; // <-- this path
import { CasesOverviewChart } from "./chart";

type PropsType = { timeFrame?: string; className?: string };

export async function CasesOverview({ timeFrame = "monthly", className }: PropsType) {
  const data = await getCasesOverviewData(timeFrame);

  return (
    <div className={cn(
      "grid gap-2 rounded-[10px] bg-white px-7.5 pb-6 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
      className
    )}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">Cases Overview</h2>
        <PeriodPicker defaultValue={timeFrame} sectionKey="cases_overview" />
      </div>

      <CasesOverviewChart data={data} />

      <dl className="grid divide-stroke text-center dark:divide-dark-3 sm:grid-cols-2 sm:divide-x [&>div]:flex [&>div]:flex-col-reverse [&>div]:gap-1">
        <div className="dark:border-dark-3 max-sm:mb-3 max-sm:border-b max-sm:pb-3">
          <dt className="text-xl font-bold text-dark dark:text-white">
            {standardFormat(data.open.reduce((a, p) => a + p.y, 0))}
          </dt>
          <dd className="font-medium dark:text-dark-6">Open</dd>
        </div>
        <div>
          <dt className="text-xl font-bold text-dark dark:text-white">
            {standardFormat(data.resolved.reduce((a, p) => a + p.y, 0))}
          </dt>
          <dd className="font-medium dark:text-dark-6">Resolved</dd>
        </div>
      </dl>
    </div>
  );
}
