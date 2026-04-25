"use client";

import type { HeatmapEntry } from "@/lib/types";

interface WearHeatmapProps {
  data: HeatmapEntry[];
  year: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function levelFor(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

const LEVEL_CLASSES = [
  "bg-muted/40",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/65",
  "bg-primary",
];

export function WearHeatmap({ data, year }: WearHeatmapProps) {
  // Build lookup: date string → count
  const countMap = new Map(data.map((e) => [e.date, e.count]));

  // Build all days for the year
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startDow = jan1.getDay(); // 0=Sun … 6=Sat

  type Cell = { date: Date; dateStr: string; count: number } | null;
  const cells: Cell[] = [];

  // Padding before Jan 1
  for (let i = 0; i < startDow; i++) cells.push(null);

  for (let d = new Date(jan1); d <= dec31; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: new Date(d), dateStr, count: countMap.get(dateStr) ?? 0 });
  }

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  const numWeeks = cells.length / 7;

  // Month label positions: find first week where month starts
  const monthLabels: { week: number; label: string }[] = [];
  for (let w = 0; w < numWeeks; w++) {
    const cell = cells[w * 7]; // first day of this week column (Sunday)
    if (cell) {
      const month = cell.date.getMonth();
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || prev.label !== MONTHS[month]) {
        if (w > 0 || cell.date.getDate() === 1) {
          monthLabels.push({ week: w, label: MONTHS[month] });
        }
      }
    }
  }

  const totalWears = data.reduce((s, e) => s + e.count, 0);
  const activeDays = data.filter((e) => e.count > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalWears} wear{totalWears !== 1 ? "s" : ""} across {activeDays} day{activeDays !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Less</span>
          {LEVEL_CLASSES.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-0 min-w-max">
          {/* Month labels row */}
          <div className="flex mb-1" style={{ paddingLeft: 28 }}>
            {Array.from({ length: numWeeks }).map((_, w) => {
              const label = monthLabels.find((m) => m.week === w);
              return (
                <div key={w} style={{ width: 14 }} className="text-[10px] text-muted-foreground shrink-0">
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Grid: 7 rows × numWeeks cols */}
          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAYS.map((d, i) => (
                <div key={d} style={{ height: 12, lineHeight: "12px" }} className="text-[10px] text-muted-foreground w-6 text-right pr-1">
                  {i % 2 === 1 ? d.slice(0, 1) : ""}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {Array.from({ length: numWeeks }).map((_, w) => (
              <div key={w} className="flex flex-col gap-0.5 mr-0.5">
                {Array.from({ length: 7 }).map((_, d) => {
                  const cell = cells[w * 7 + d];
                  if (!cell) {
                    return <div key={d} style={{ width: 12, height: 12 }} />;
                  }
                  const level = levelFor(cell.count);
                  return (
                    <div
                      key={d}
                      title={`${cell.dateStr}${cell.count ? ` · ${cell.count} wear${cell.count !== 1 ? "s" : ""}` : ""}`}
                      className={`rounded-sm cursor-default ${LEVEL_CLASSES[level]}`}
                      style={{ width: 12, height: 12 }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
