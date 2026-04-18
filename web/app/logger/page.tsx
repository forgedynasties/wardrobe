"use client";

import { useEffect, useState } from "react";
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

            return (
              <div
                key={idx}
                className={`relative min-h-14 md:min-h-24 rounded-lg border flex items-center justify-center cursor-pointer transition-all p-1 md:p-2 group ${
                  !day
                    ? "bg-transparent border-transparent cursor-default"
                    : hasLog
                      ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                      : "bg-card border-border hover:border-primary/50"
                }`}
                onClick={() => day && handleDateClick(day)}
              >
                {day && (
                  <>
                    <div className="absolute top-1 left-1.5 text-[10px] md:text-xs font-medium text-muted-foreground leading-none">
                      {day}
                    </div>
                    {hasLog && log && (
                      <>
                        {log.items && log.items.length > 0 ? (
                          <div className="flex gap-0.5 md:gap-1 flex-wrap justify-center items-center px-1 pt-3">
                            {log.items.slice(0, 3).map((item) => {
                              const imgSrc =
                                item.image_status === "done" && item.image_url
                                  ? imageUrl(item.image_url)
                                  : item.raw_image_url
                                    ? imageUrl(item.raw_image_url)
                                    : null;

                              return imgSrc ? (
                                <img
                                  key={item.id}
                                  src={imgSrc}
                                  alt={item.category}
                                  className="w-5 h-5 md:w-9 md:h-9 rounded object-contain"
                                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null;
                            })}
                          </div>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        {log.items && log.items.length > 3 && (
                          <div className="absolute bottom-1 right-1 text-[9px] md:text-[10px] font-medium text-muted-foreground bg-muted/80 rounded-full px-1.5 py-0.5 leading-none">
                            +{log.items.length - 3}
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
    </div>
  );
}
