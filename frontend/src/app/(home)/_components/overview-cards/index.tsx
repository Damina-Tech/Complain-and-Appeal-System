"use client";
import { useEffect, useState } from "react";
import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";

export function OverviewCardsGroup() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getOverviewData>> | null>(null);
  useEffect(() => {
    let active = true;
    void getOverviewData().then(value => { if (active) setData(value); });
    return () => { active = false; };
  }, []);
  if (!data) return <div className="p-6">Loading report?</div>;
  const { totalCases, totalCaseOwners, totalSolvedCases, totalPendingCases } = data;

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <OverviewCard
        label="Total Cases"
        data={{
          ...totalCases,
          value: compactFormat(totalCases.value),
        }}
        Icon={icons.TotalCases}
      />

      <OverviewCard
        label="Total Case Owners"
        data={{
          ...totalCaseOwners,
          value: compactFormat(totalCaseOwners.value),
        }}
        Icon={icons.CaseOwners}
      />

      <OverviewCard
        label="Total Solved Cases"
        data={{
          ...totalSolvedCases,
          value: compactFormat(totalSolvedCases.value),
        }}
        Icon={icons.SolvedCases}
      />

      <OverviewCard
        label="Total Pending Cases"
        data={{
          ...totalPendingCases,
          value: compactFormat(totalPendingCases.value),
        }}
        Icon={icons.PendingCases}
      />
    </div>
  );
}
