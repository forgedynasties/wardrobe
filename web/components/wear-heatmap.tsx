"use client";

import type { HeatmapEntry } from "@/lib/types";

interface WearHeatmapProps {
  data: HeatmapEntry[];
  year: number;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function computeStreaks(activeDates: Set<string>, year: number) {
  let current = 0;
  let longest = 0;
  let streak = 0;

  const today = new Date().toISOString().slice(0, 10);
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  // Walk every day of the year to compute longest streak
  for (let d = new Date(jan1); d <= dec31; d.setDate(d.getDate() + 1)) {
    const s = d.toISOString().slice(0, 10);
    if (activeDates.has(s)) {
      streak++;
      if (streak > longest) longest = streak;
    } else {
      streak = 0;
    }
  }

  // Current streak: walk backwards from today
  for (let d = new Date(today); ; d.setDate(d.getDate() - 1)) {
    const s = d.toISOString().slice(0, 10);
    if (!activeDates.has(s)) break;
    current++;
    if (d.getFullYear() < year) break;
  }

  return { current, longest };
}

export function WearHeatmap({ data, year }: WearHeatmapProps) {
  const activeDates = new Set(data.filter((e) => e.count > 0).map((e) => e.date));
  const activeDays = activeDates.size;
  const { current, longest } = computeStreaks(activeDates, year);

  // Build all day cells for the year
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const startDow = jan1.getDay();

  type Cell = { date: Date; dateStr: string; active: boolean } | null;
  const cells: Cell[] = [];

  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = new Date(jan1); d <= dec31; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    cells.push({ date: new Date(d), dateStr, active: activeDates.has(dateStr) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const numWeeks = cells.length / 7;

  // Month labels
  const monthLabels: { week: number; label: string }[] = [];
  for (let w = 0; w < numWeeks; w++) {
    const cell = cells[w * 7];
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

  return (
    <div className="space-y-4">
      {/* streak stats */}
      <div className="flex gap-6">
        <div>
          <p className="text-2xl font-bold">{current}</p>
          <p className="text-xs text-muted-foreground">day streak</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{longest}</p>
          <p className="text-xs text-muted-foreground">longest streak</p>
        </div>
        <div>
          <p className="text-2xl font-bold">{activeDays}</p>
          <p className="text-xs text-muted-foreground">days logged</p>
        </div>
      </div>

      {/* grid */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-0 min-w-max">
          {/* Month labels */}
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
                  if (!cell) return <div key={d} style={{ width: 12, height: 12 }} />;
                  return (
                    <div
                      key={d}
                      title={cell.dateStr}
                      className={`rounded-sm cursor-default ${cell.active ? "bg-primary" : "bg-muted/40"}`}
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
