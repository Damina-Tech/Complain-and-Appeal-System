import { PeriodPicker } from "@/components/period-picker";
import { cn } from "@/lib/utils";
import { getCasesByCategoryData } from "@/services/case-reports-services";
import { CasesByCategoryDonut } from "./pie";
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

type PropsType = { timeFrame?: string; className?: string };

export async function CasesByCategory({ timeFrame = "monthly", className }: PropsType) {
  const data = await getCasesByCategoryData(timeFrame);
  
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
    <div
      className={cn(
        "grid grid-cols-1 grid-rows-[auto_1fr] gap-9 rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">{t("dashboard", "casesByCategory")}</h2>
        <PeriodPicker defaultValue={timeFrame} sectionKey="cases_by_category" />
      </div>

      <div className="grid place-items-center">
        <CasesByCategoryDonut data={data} />
      </div>
    </div>
  );
}
