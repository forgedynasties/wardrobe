"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getOutfitLogs, getOutfits, logOutfitWear, getItems, deleteOutfitLog, updateOutfitLog, imageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OutfitCanvas } from "@/components/outfit-canvas";
import type { Outfit, ClothingItem, OutfitLog } from "@/lib/types";

const CATEGORY_WEIGHT: Record<string, number> = {
  outerwear: 5,
  top: 4,
  bottom: 3,
  shoes: 2,
  accessory: 1,
};

const itemImgSrc = (item: ClothingItem): string | null => {
  if (item.image_status === "done" && item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return null;
};

const sortByCategory = (items: ClothingItem[]) =>
  [...items].sort(
    (a, b) =>
      (CATEGORY_WEIGHT[b.category?.toLowerCase() ?? ""] ?? 0) -
      (CATEGORY_WEIGHT[a.category?.toLowerCase() ?? ""] ?? 0)
  );

type View = "week" | "month" | "year";

const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const startOfWeek = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
};
const startOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0);

function viewRange(view: View, anchor: Date): { start: Date; end: Date } {
  if (view === "week") {
    const s = startOfWeek(anchor);
    return { start: s, end: addDays(s, 6) };
  }
  if (view === "month") {
    return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }
  return {
    start: new Date(anchor.getFullYear(), 0, 1),
    end: new Date(anchor.getFullYear(), 11, 31),
  };
}

export default function OutfitLoggerPage() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(new Date());
  const [logs, setLogs] = useState<Map<string, OutfitLog>>(new Map());
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ dateStr: string; log: OutfitLog } | null>(null);
  const [editingLog, setEditingLog] = useState<OutfitLog | null>(null);
  const [peek, setPeek] = useState<{ log: OutfitLog; x: number; y: number } | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePeekEnter = (e: React.MouseEvent<HTMLDivElement>, log: OutfitLog | null) => {
    if (!log) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = setTimeout(() => {
      setPeek({ log, x: rect.left + rect.width / 2, y: rect.top });
    }, 400);
  };

  const handlePeekLeave = () => {
    if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    peekTimerRef.current = null;
    setPeek(null);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [outfitsData, itemsData] = await Promise.all([
        getOutfits(),
        getItems(),
      ]);
      setOutfits(outfitsData);
      setItems(itemsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const { start, end } = viewRange(view, anchor);
      const logsData = await getOutfitLogs(toKey(start), toKey(end));
      console.log("[DEBUG] raw wear_dates from server:", logsData.map(l => l.wear_date));
      const logsMap = new Map(
        logsData.map((log) => {
          const dateKey = log.wear_date.split("T")[0];
          console.log("[DEBUG] mapping wear_date", log.wear_date, "→ key", dateKey);
          return [dateKey, log];
        })
      );
      setLogs(logsMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateClick = (date: Date) => {
    const dateStr = toKey(date);
    console.log("[DEBUG] clicked date:", date.toString(), "→ key:", dateStr);
    const existingLog = logs.get(dateStr);

    setSelectedDate(date);
    setSaveError(null);

    if (existingLog) {
      setEditingLog(existingLog);
      setSelectedItems(new Set((existingLog.items || []).map((item) => item.id)));
      setNotes(existingLog.notes);
    } else {
      setEditingLog(null);
      setSelectedItems(new Set());
      setNotes("");
    }

    setShowLogSheet(true);
  };

  const shiftAnchor = (dir: -1 | 1) => {
    setAnchor((prev) => {
      if (view === "week") return addDays(prev, dir * 7);
      if (view === "month")
        return new Date(prev.getFullYear(), prev.getMonth() + dir, 1);
      return new Date(prev.getFullYear() + dir, 0, 1);
    });
  };

  const resetForm = () => {
    setSelectedItems(new Set());
    setNotes("");
    setSaveError(null);
    setEditingLog(null);
  };

  const handleSaveLog = async () => {
    if (!selectedDate) return;

    setSaving(true);
    setSaveError(null);
    try {
      if (editingLog) {
        // Update existing log
        await updateOutfitLog(editingLog.id, {
          notes,
          item_ids: Array.from(selectedItems),
        });
      } else {
        // Create new log
        if (selectedItems.size === 0) {
          setSaveError("Please select at least one item");
          setSaving(false);
          return;
        }

        const dateString = `${toKey(selectedDate)}T00:00:00Z`;
        console.log("[DEBUG] saving log for selectedDate:", selectedDate.toString(), "→ dateString:", dateString);

        const requestData: Record<string, unknown> = {
          wear_date: dateString,
          item_ids: Array.from(selectedItems),
        };

        if (notes) {
          requestData.notes = notes;
        }

        await logOutfitWear(requestData as any);
      }

      resetForm();
      setShowLogSheet(false);
      await loadLogs();
      await loadData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save log";
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOutfitLog(deleteTarget.log.id);
      setDeleteTarget(null);
      await loadLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const today = new Date();
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const buildMonthCells = (year: number, month: number): (Date | null)[] => {
    const first = new Date(year, month, 1).getDay();
    const total = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
    return cells;
  };

  const buildWeekCells = (d: Date): Date[] => {
    const s = startOfWeek(d);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  };

  const rangeTitle = (() => {
    if (view === "week") {
      const s = startOfWeek(anchor);
      const e = addDays(s, 6);
      const sameMonth = s.getMonth() === e.getMonth();
      const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
      const left = s.toLocaleDateString("en-US", opts);
      const right = sameMonth
        ? e.getDate().toString()
        : e.toLocaleDateString("en-US", opts);
      return `${left} – ${right}, ${e.getFullYear()}`;
    }
    if (view === "month") {
      return anchor.toLocaleString("default", { month: "long", year: "numeric" });
    }
    return String(anchor.getFullYear());
  })();

  const renderDayCell = (
    date: Date | null,
    idx: number,
    prevHasLog: boolean,
    nextHasLog: boolean,
    compact: boolean,
    showWeekday = false,
  ) => {
    const dateStr = date ? toKey(date) : null;
    const log = dateStr ? logs.get(dateStr) ?? null : null;
    const hasLog = !!log;
    const isToday = !!date && isSameDay(date, today);
    const sortedItems = log?.items ? sortByCategory(log.items) : [];
    const itemCount = sortedItems.length;
    const hasPrevStreak = hasLog && prevHasLog;
    const hasNextStreak = hasLog && nextHasLog;

    if (compact) {
      return (
        <div
          key={idx}
          className={`relative aspect-square rounded-sm flex items-center justify-center text-[9px] cursor-pointer transition-colors ${
            !date
              ? "bg-transparent cursor-default"
              : hasLog
                ? "bg-primary/30 hover:bg-primary/50 text-foreground"
                : "bg-muted/40 hover:bg-muted/70 text-muted-foreground"
          } ${isToday ? "ring-1 ring-primary" : ""}`}
          onClick={() => date && handleDateClick(date)}
          onMouseEnter={(e) => handlePeekEnter(e, log)}
          onMouseLeave={handlePeekLeave}
        >
          {date?.getDate()}
        </div>
      );
    }

    const sizeClass =
      view === "week"
        ? "min-h-24 md:min-h-40"
        : "min-h-14 md:min-h-24";

    return (
      <div
        key={idx}
        className={`relative ${sizeClass} rounded-lg border flex items-center justify-center cursor-pointer transition-all p-1 md:p-2 group ${
          !date
            ? "bg-transparent border-transparent cursor-default"
            : hasLog
              ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
              : "bg-card border-border hover:border-primary/50"
        } ${isToday ? "ring-2 ring-primary/60" : ""}`}
        onClick={() => date && handleDateClick(date)}
        onMouseEnter={(e) => handlePeekEnter(e, log)}
        onMouseLeave={handlePeekLeave}
      >
        {date && (
          <>
            {hasPrevStreak && (
              <div className="absolute top-1/2 -left-1 md:-left-2 h-0.5 w-1 md:w-2 bg-primary/50 -translate-y-1/2 pointer-events-none" />
            )}
            {hasNextStreak && (
              <div className="absolute top-1/2 -right-1 md:-right-2 h-0.5 w-1 md:w-2 bg-primary/50 -translate-y-1/2 pointer-events-none" />
            )}
            <div
              className={`absolute top-1 left-1.5 text-[10px] md:text-xs font-medium leading-none z-20 ${
                isToday ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {date.getDate()}
            </div>
            {showWeekday && (
              <div className="absolute top-1 right-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground z-20">
                {date.toLocaleDateString("en-US", { weekday: "short" })}
              </div>
            )}
            {hasLog && log && (
              <>
                {itemCount === 0 && (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                )}
                {itemCount >= 1 && (
                  <div className="absolute inset-[10px]">
                    <OutfitCanvas items={sortedItems.slice(0, 4)} />
                  </div>
                )}
                {sortedItems.length > 4 && (
                  <div className="absolute bottom-1 right-1 text-[9px] md:text-[10px] font-medium text-muted-foreground bg-muted/80 rounded-full px-1.5 py-0.5 leading-none z-20">
                    +{sortedItems.length - 4}
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (dateStr) setDeleteTarget({ dateStr, log });
                  }}
                  className="absolute top-0.5 right-1 text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity leading-none z-20"
                >
                  &times;
                </button>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-64" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Outfit Logger</h1>
        <p className="text-muted-foreground">Track what you wore each day</p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => shiftAnchor(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg md:text-xl font-semibold min-w-40 text-center">
            {rangeTitle}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => shiftAnchor(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40">
          {(["week", "month", "year"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1 text-xs font-medium rounded capitalize transition-colors ${
                view === v
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <Card className="p-3 md:p-6">
        {view === "week" && (
          <>
            <div className="grid grid-cols-3 gap-2 md:hidden">
              {buildWeekCells(anchor).map((d, idx, arr) => {
                const prev = idx > 0 ? logs.has(toKey(arr[idx - 1])) : false;
                const next = idx < arr.length - 1 ? logs.has(toKey(arr[idx + 1])) : false;
                return renderDayCell(d, idx, prev, next, false, true);
              })}
            </div>

            <div className="hidden md:grid md:grid-cols-7 gap-1 md:gap-2">
              {buildWeekCells(anchor).map((d, i) => (
                <div
                  key={`h-${i}`}
                  className="text-center font-semibold text-xs text-muted-foreground py-2"
                >
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
              ))}
              {buildWeekCells(anchor).map((d, idx, arr) => {
                const prev = idx > 0 ? logs.has(toKey(arr[idx - 1])) : false;
                const next = idx < arr.length - 1 ? logs.has(toKey(arr[idx + 1])) : false;
                return renderDayCell(d, idx, prev, next, false);
              })}
            </div>
          </>
        )}

        {view === "month" && (
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div
                key={`h-${i}`}
                className="text-center font-semibold text-xs text-muted-foreground py-2"
              >
                {d}
              </div>
            ))}
            {(() => {
              const cells = buildMonthCells(anchor.getFullYear(), anchor.getMonth());
              const sameRow = (a: number, b: number) => Math.floor(a / 7) === Math.floor(b / 7);
              return cells.map((d, idx) => {
                const prev =
                  idx > 0 && sameRow(idx - 1, idx) && cells[idx - 1]
                    ? logs.has(toKey(cells[idx - 1]!))
                    : false;
                const next =
                  idx < cells.length - 1 && sameRow(idx + 1, idx) && cells[idx + 1]
                    ? logs.has(toKey(cells[idx + 1]!))
                    : false;
                return renderDayCell(d, idx, prev, next, false);
              });
            })()}
          </div>
        )}

        {view === "year" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, m) => {
              const cells = buildMonthCells(anchor.getFullYear(), m);
              const label = new Date(anchor.getFullYear(), m, 1).toLocaleString(
                "default",
                { month: "short" },
              );
              return (
                <div key={m} className="space-y-1.5">
                  <button
                    onClick={() => {
                      setView("month");
                      setAnchor(new Date(anchor.getFullYear(), m, 1));
                    }}
                    className="text-xs font-semibold hover:text-primary transition-colors"
                  >
                    {label}
                  </button>
                  <div className="grid grid-cols-7 gap-0.5">
                    {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                      <div
                        key={`h-${m}-${i}`}
                        className="text-center text-[8px] text-muted-foreground"
                      >
                        {d}
                      </div>
                    ))}
                    {cells.map((d, idx) => renderDayCell(d, idx, false, false, true))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Sheet open={showLogSheet} onOpenChange={(open) => { setShowLogSheet(open); if (!open) resetForm(); }}>
        <SheetContent side="bottom" className="h-[80vh] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>
              {editingLog ? "Edit log for" : "Log outfit for"} {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </SheetTitle>
            <SheetDescription>
              {selectedItems.size} {selectedItems.size === 1 ? "item" : "items"} selected — tap to add or remove
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-4 overflow-hidden">
            <div className="flex-1 min-h-0 bg-muted/30 rounded-lg border relative overflow-hidden">
              {selectedItems.size === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <div className="text-4xl opacity-40">✨</div>
                  <p className="text-xs">Pick items below to build your outfit</p>
                </div>
              ) : (
                <OutfitCanvas
                  items={items.filter((i) => selectedItems.has(i.id))}
                  className="p-4"
                />
              )}
            </div>

            <div className="flex-shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Wardrobe</Label>
                {selectedItems.size > 0 && (
                  <button
                    onClick={() => setSelectedItems(new Set())}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
                {items.map((item) => {
                  const src =
                    item.image_status === "done" && item.image_url
                      ? imageUrl(item.image_url)
                      : item.raw_image_url
                        ? imageUrl(item.raw_image_url)
                        : null;
                  const isSelected = selectedItems.has(item.id);

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const newSelected = new Set(selectedItems);
                        if (newSelected.has(item.id)) {
                          newSelected.delete(item.id);
                        } else {
                          newSelected.add(item.id);
                        }
                        setSelectedItems(newSelected);
                      }}
                      className={`relative flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg border-2 transition-all snap-start ${
                        isSelected
                          ? "bg-primary/15 border-primary scale-95"
                          : "bg-muted/50 border-border hover:border-primary/50"
                      }`}
                      title={item.sub_category || item.category}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={item.category}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-0.5">
                          <div className="text-lg">👕</div>
                          <div className="text-[9px] font-medium px-1 truncate">
                            {item.sub_category || item.category}
                          </div>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="flex-shrink-0"
            />

            {saveError && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm flex-shrink-0">
                {saveError}
              </div>
            )}

            <div className="flex gap-2 flex-shrink-0">
              <Button
                className="flex-1"
                onClick={handleSaveLog}
                disabled={saving || (selectedItems.size === 0 && !editingLog)}
              >
                {saving ? "Saving..." : editingLog ? "Update" : "Save"}
              </Button>
              {editingLog && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (selectedDate && editingLog) {
                      const dateStr = selectedDate.toISOString().split("T")[0];
                      setDeleteTarget({ dateStr, log: editingLog });
                      setShowLogSheet(false);
                    }
                  }}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => { setShowLogSheet(false); resetForm(); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete log entry</DialogTitle>
            <DialogDescription>
              Remove the outfit log for this day? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLog}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {peek && (
        <div
          className="fixed z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
          style={{
            left: peek.x,
            top: peek.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 min-w-56 max-w-72">
            <div className="space-y-2">
              {sortByCategory(peek.log.items || []).map((item) => {
                const src = itemImgSrc(item);
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-muted/40 rounded flex items-center justify-center flex-shrink-0">
                      {src ? (
                        <img
                          src={src}
                          alt={item.category}
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-sm">👕</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium capitalize truncate">
                        {item.sub_category || item.category}
                      </div>
                      {item.colors && item.colors.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {item.colors.slice(0, 4).map((c, ci) => (
                            <div
                              key={ci}
                              className="w-2.5 h-2.5 rounded-full border border-border"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {peek.log.notes && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground italic">
                &ldquo;{peek.log.notes}&rdquo;
              </div>
            )}
          </div>
          <div
            className="w-2 h-2 bg-popover border-r border-b rotate-45 mx-auto -mt-1"
            style={{ transform: "translateY(-4px) rotate(45deg)" }}
          />
        </div>
      )}
    </div>
  );
}
