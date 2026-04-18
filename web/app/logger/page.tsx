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

export default function OutfitLoggerPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
    loadMonthLogs();
  }, [currentMonth]);

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

  const loadMonthLogs = async () => {
    try {
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const startDate = firstDay.toISOString().split("T")[0];
      const endDate = lastDay.toISOString().split("T")[0];

      const logsData = await getOutfitLogs(startDate, endDate);
      const logsMap = new Map(
        logsData.map((log) => {
          const dateKey = log.wear_date.split("T")[0];
          return [dateKey, log];
        })
      );
      setLogs(logsMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDateClick = (date: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), date);
    const dateStr = newDate.toISOString().split("T")[0];
    const existingLog = logs.get(dateStr);

    setSelectedDate(newDate);
    setSaveError(null);

    if (existingLog) {
      // Load existing log for editing
      setEditingLog(existingLog);
      setSelectedItems(new Set((existingLog.items || []).map((item) => item.id)));
      setNotes(existingLog.notes);
    } else {
      // New log
      setEditingLog(null);
      setSelectedItems(new Set());
      setNotes("");
    }

    setShowLogSheet(true);
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

        const wearDate = new Date(selectedDate);
        wearDate.setHours(0, 0, 0, 0);
        const dateString = wearDate.toISOString();

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
      await loadMonthLogs();
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
      await loadMonthLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days: (number | null)[] = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

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

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg md:text-xl font-semibold">{monthName}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-3 md:p-6">
        <div className="grid grid-cols-7 gap-1 md:gap-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div key={i} className="text-center font-semibold text-xs text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            const dateStr = day
              ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                  .toISOString()
                  .split("T")[0]
              : null;
            const hasLog = dateStr && logs.has(dateStr);
            const log = dateStr ? logs.get(dateStr) : null;
            const now = new Date();
            const isToday =
              !!day &&
              currentMonth.getFullYear() === now.getFullYear() &&
              currentMonth.getMonth() === now.getMonth() &&
              day === now.getDate();

            const sortedItems = log?.items ? sortByCategory(log.items) : [];
            const itemCount = sortedItems.length;
            const displayedCount = itemCount === 1 ? 1 : itemCount <= 3 ? itemCount : 4;
            const overflow = itemCount - displayedCount;

            const logAt = (i: number): boolean => {
              const d = days[i];
              if (!d) return false;
              const ds = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d)
                .toISOString()
                .split("T")[0];
              return logs.has(ds);
            };
            const sameRow = (a: number, b: number) => Math.floor(a / 7) === Math.floor(b / 7);
            const hasPrevStreak = hasLog && sameRow(idx - 1, idx) && logAt(idx - 1);
            const hasNextStreak = hasLog && sameRow(idx + 1, idx) && logAt(idx + 1);

            return (
              <div
                key={idx}
                className={`relative min-h-14 md:min-h-24 rounded-lg border flex items-center justify-center cursor-pointer transition-all p-1 md:p-2 group ${
                  !day
                    ? "bg-transparent border-transparent cursor-default"
                    : hasLog
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                      : "bg-card border-border hover:border-primary/50"
                } ${isToday ? "ring-2 ring-primary/60" : ""}`}
                onClick={() => day && handleDateClick(day)}
                onMouseEnter={(e) => handlePeekEnter(e, log ?? null)}
                onMouseLeave={handlePeekLeave}
              >
                {day && (
                  <>
                    {hasPrevStreak && (
                      <div className="absolute top-1/2 -left-1 md:-left-2 h-0.5 w-1 md:w-2 bg-primary/50 -translate-y-1/2 pointer-events-none" />
                    )}
                    {hasNextStreak && (
                      <div className="absolute top-1/2 -right-1 md:-right-2 h-0.5 w-1 md:w-2 bg-primary/50 -translate-y-1/2 pointer-events-none" />
                    )}
                    <div
                      className={`absolute top-1 left-1.5 text-[10px] md:text-xs font-medium leading-none ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </div>
                    {hasLog && log && (
                      <>
                        {itemCount === 0 && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        {itemCount === 1 && (() => {
                          const item = sortedItems[0];
                          const src = itemImgSrc(item);
                          return src ? (
                            <img
                              src={src}
                              alt={item.category}
                              className="w-full h-full object-contain p-2 md:p-3"
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null;
                        })()}
                        {itemCount >= 2 && itemCount <= 3 && (
                          <div className="flex items-center justify-center pt-2">
                            {sortedItems.map((item, i) => {
                              const src = itemImgSrc(item);
                              return src ? (
                                <img
                                  key={item.id}
                                  src={src}
                                  alt={item.category}
                                  className={`w-8 h-8 md:w-12 md:h-12 rounded object-contain ${
                                    i > 0 ? "-ml-3 md:-ml-4" : ""
                                  }`}
                                  style={{ zIndex: sortedItems.length - i }}
                                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null;
                            })}
                          </div>
                        )}
                        {itemCount >= 4 && (
                          <div className="grid grid-cols-2 gap-0.5 w-full h-full pt-3">
                            {sortedItems.slice(0, 4).map((item) => {
                              const src = itemImgSrc(item);
                              return src ? (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-center overflow-hidden"
                                >
                                  <img
                                    src={src}
                                    alt={item.category}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                        {overflow > 0 && (
                          <div className="absolute bottom-1 right-1 text-[9px] md:text-[10px] font-medium text-muted-foreground bg-muted/80 rounded-full px-1.5 py-0.5 leading-none">
                            +{overflow}
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dateStr && log) {
                              setDeleteTarget({ dateStr, log });
                            }
                          }}
                          className="absolute top-0.5 right-1 text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                        >
                          &times;
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Sheet open={showLogSheet} onOpenChange={(open) => { setShowLogSheet(open); if (!open) resetForm(); }}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingLog ? "Edit log for" : "Log outfit for"} {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </SheetTitle>
            <SheetDescription>
              {editingLog ? "Update what you wore" : "Record what you wore"}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label>Select Items ({selectedItems.size} selected)</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
                {items.map((item) => {
                  const src =
                    item.image_status === "done" && item.image_url
                      ? imageUrl(item.image_url)
                      : item.raw_image_url
                        ? imageUrl(item.raw_image_url)
                        : null;

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
                      className={`rounded-lg border-2 transition-all overflow-hidden aspect-square flex flex-col items-center justify-center ${
                        selectedItems.has(item.id)
                          ? "bg-primary/15 border-primary"
                          : "bg-muted/50 border-border hover:border-primary/50"
                      }`}
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={item.category}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 p-1">
                          <div className="text-lg">👕</div>
                          <div className="text-[10px] font-medium">{item.sub_category || item.category}</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did you feel? Any notes?"
              />
            </div>

            {saveError && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm">
                {saveError}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSaveLog}
                disabled={saving || (selectedItems.size === 0 && !editingLog)}
              >
                {saving ? "Saving..." : editingLog ? "Update Log" : "Save Log"}
              </Button>
              {editingLog && (
                <Button
                  variant="destructive"
                  className="flex-1"
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
                className="flex-1"
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
