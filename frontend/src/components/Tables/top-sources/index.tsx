import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getTopSources } from "./fetch"; // ⬅️ ensure this path

export async function TopSources({ className }: { className?: string }) {
  const data = await getTopSources();
  // [{ name: "Web", submissions: 320, resolvedPct: 78, avgDays: 3.1 }, ...]

  return (
    <div className={cn(
      "grid rounded-[10px] bg-white px-7.5 pb-4 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
      className
    )}>
      <h2 className="mb-4 text-body-2xlg font-bold text-dark dark:text-white">Top Sources</h2>

      <Table>
        <TableHeader>
          <TableRow className="border-none uppercase [&>th]:text-center">
            <TableHead className="min-w-[120px] !text-left">Source</TableHead>
            <TableHead>Submissions</TableHead>
            <TableHead>Resolved %</TableHead>
            <TableHead className="!text-right">Avg. Resolution (days)</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((row) => (
            <TableRow key={row.name} className="text-center text-base font-medium text-dark dark:text-white">
              <TableCell className="!text-left">{row.name}</TableCell>
              <TableCell>{row.submissions}</TableCell>
              <TableCell>{row.resolvedPct}%</TableCell>
              <TableCell className="!text-right">{row.avgDays?.toFixed(1) ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
