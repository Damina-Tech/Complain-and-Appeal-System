import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getTopSources } from "./fetch"; // ⬅️ ensure this path
import { cookies } from "next/headers";
import { translations } from "@/lib/translations";

export async function TopSources({ className }: { className?: string }) {
  const data = await getTopSources();
  // [{ name: "Web", submissions: 320, resolvedPct: 78, avgDays: 3.1 }, ...]
  
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
    <div className={cn(
      "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
      className
    )}>
      <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">{t("dashboard", "topSources")}</h2>

      <Table>
        <TableHeader>
          <TableRow className="border-none uppercase [&>th]:text-center">
            <TableHead className="min-w-[120px] !text-left">{t("common", "source")}</TableHead>
            <TableHead>{t("common", "submissions")}</TableHead>
            <TableHead>{t("common", "resolved")} %</TableHead>
            <TableHead className="!text-right">{t("common", "avgResolution")} ({t("common", "days")})</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                {t("common", "noDataAvailable")}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.name} className="text-center text-base font-medium text-dark dark:text-white">
                <TableCell className="!text-left">{row.name}</TableCell>
                <TableCell>{row.submissions}</TableCell>
                <TableCell>{row.resolvedPct}%</TableCell>
                <TableCell className="!text-right">{row.avgDays?.toFixed(1) ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
