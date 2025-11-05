import { PeriodPicker } from "@/components/period-picker";
import { cn } from "@/lib/utils";
import { getCasesByCategoryData } from "@/services/case-reports-services";
import { CasesByCategoryDonut } from "./pie";

type PropsType = { timeFrame?: string; className?: string };

export async function CasesByCategory({ timeFrame = "monthly", className }: PropsType) {
  const data = await getCasesByCategoryData(timeFrame);

  return (
    <div
      className={cn(
        "grid grid-cols-1 grid-rows-[auto_1fr] gap-9 rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">Cases by Category</h2>
        <PeriodPicker defaultValue={timeFrame} sectionKey="cases_by_category" />
      </div>

      <div className="grid place-items-center">
        <CasesByCategoryDonut data={data} />
      </div>
    </div>
  );
}
