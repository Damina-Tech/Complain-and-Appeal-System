import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export async function OverviewCardsGroup() {
  const { totalCases, totalCaseOwners, totalSolvedCases, totalPendingCases } = await getOverviewData();
  
  // Get language from cookies for server component
  const cookieStore = await cookies();
  const lang = (cookieStore.get("selectedLanguage")?.value || "en") as "en" | "am" | "om";
  
  // Helper function to get translation with language
  const t = (ns: "dashboard" | "common" | "cases", key: string) => {
    const namespaceTranslations = translations[ns];
    if (!namespaceTranslations) return key;
    const langTranslations = namespaceTranslations[lang];
    if (!langTranslations) return key;
    return (langTranslations as any)[key] || key;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <OverviewCard
        label={t("dashboard", "totalCases")}
        data={{
          ...totalCases,
          value: compactFormat(totalCases.value),
        }}
        Icon={icons.TotalCases}
      />

      <OverviewCard
        label={t("dashboard", "totalCaseOwners")}
        data={{
          ...totalCaseOwners,
          value: compactFormat(totalCaseOwners.value),
        }}
        Icon={icons.CaseOwners}
      />

      <OverviewCard
        label={t("dashboard", "totalSolvedCases")}
        data={{
          ...totalSolvedCases,
          value: compactFormat(totalSolvedCases.value),
        }}
        Icon={icons.SolvedCases}
      />

      <OverviewCard
        label={t("dashboard", "totalPendingCases")}
        data={{
          ...totalPendingCases,
          value: compactFormat(totalPendingCases.value),
        }}
        Icon={icons.PendingCases}
      />
    </div>
  );
}
