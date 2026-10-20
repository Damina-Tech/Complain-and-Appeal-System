"use client";
import { useEffect, useState } from "react";
import { PeriodPicker } from "@/components/period-picker";
import { cn } from "@/lib/utils";
import { getCasesByCategoryData } from "@/services/case-reports-services";
import { CasesByCategoryDonut } from "./pie";

type PropsType = { timeFrame?: string; className?: string };

export function CasesByCategory({ timeFrame = "monthly", className }: PropsType) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getCasesByCategoryData>> | null>(null);
  useEffect(() => {
    let active = true;
    void getCasesByCategoryData(timeFrame).then(value => { if (active) setData(value); });
    return () => { active = false; };
  }, [timeFrame]);
  if (!data) return <div className="p-6">Loading report...</div>;

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
