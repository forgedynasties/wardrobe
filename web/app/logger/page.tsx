"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getOutfitLogs, getOutfits, logOutfitWear, getItems, deleteOutfitLog, addOutfitItem, createOutfit, imageUrl } from "@/lib/api";
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
  const [logMode, setLogMode] = useState<"outfit" | "items">("outfit");
  const [selectedOutfit, setSelectedOutfit] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveAsOutfit, setSaveAsOutfit] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ dateStr: string; log: OutfitLog } | null>(null);

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
    setSelectedDate(newDate);
    setShowLogSheet(true);
    setSaveError(null);
  };

  const resetForm = () => {
    setSelectedOutfit("");
    setSelectedItems(new Set());
    setNotes("");
    setSaveAsOutfit(false);
    setOutfitName("");
    setSaveError(null);
  };

  const handleSaveLog = async () => {
    if (!selectedDate) return;

    setSaving(true);
    setSaveError(null);
    try {
      const wearDate = new Date(selectedDate);
      wearDate.setHours(0, 0, 0, 0);
      const dateString = wearDate.toISOString();

      if (logMode === "outfit" && !selectedOutfit) {
        setSaveError("Please select an outfit");
        setSaving(false);
        return;
      }

      if (logMode === "items" && selectedItems.size === 0) {
        setSaveError("Please select at least one item");
        setSaving(false);
        return;
      }

      let outfitIdToLog: string | undefined = selectedOutfit || undefined;

      if (logMode === "items" && saveAsOutfit) {
        if (!outfitName.trim()) {
          setSaveError("Please enter an outfit name");
          setSaving(false);
          return;
        }

        const newOutfit = await createOutfit({ name: outfitName });
        outfitIdToLog = newOutfit.id;

        for (const itemId of Array.from(selectedItems)) {
          try {
            await addOutfitItem(newOutfit.id, itemId);
          } catch (err) {
            console.error("Failed to add item to outfit:", err);
          }
        }
      }

      const requestData: Record<string, unknown> = {
        wear_date: dateString,
      };

      if (outfitIdToLog) {
        requestData.outfit_id = outfitIdToLog;
      }
      if (logMode === "items" && selectedItems.size > 0 && !saveAsOutfit) {
        requestData.item_ids = Array.from(selectedItems);
      }
      if (notes) {
        requestData.notes = notes;
      }

      await logOutfitWear(requestData as any);

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
                className={`min-h-14 md:min-h-24 rounded-lg border flex flex-col items-center justify-start cursor-pointer transition-all p-1 md:p-2 group ${
                  !day
                    ? "bg-transparent border-transparent cursor-default"
                    : hasLog
                      ? "bg-primary/10 border-primary/30 hover:bg-primary/20"
                      : "bg-card border-border hover:border-primary/50"
                }`}
                onClick={() => day && handleDateClick(day)}
              >
                {day && (
                  <>
                    <div className="text-xs md:text-sm font-medium mb-0.5">{day}</div>
                    {hasLog && log && (
                      <div className="flex flex-col items-center gap-0.5 w-full flex-1">
                        <div className="flex gap-0.5 md:gap-1 flex-wrap justify-center w-full items-center">
                          {log.items && log.items.length > 0 ? (
                            log.items.slice(0, 4).map((item) => {
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
                                  className="w-5 h-5 md:w-9 md:h-9 rounded object-cover"
                                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null;
                            })
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dateStr && log) {
                              setDeleteTarget({ dateStr, log });
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                      </div>
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
              Log outfit for {selectedDate?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </SheetTitle>
            <SheetDescription>
              Record what you wore
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label>Log Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={logMode === "outfit" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogMode("outfit")}
                >
                  Existing Outfit
                </Button>
                <Button
                  variant={logMode === "items" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogMode("items")}
                >
                  Select Items
                </Button>
              </div>
            </div>

            {logMode === "outfit" ? (
              <div className="space-y-2">
                <Label>Choose Outfit</Label>
                <Select value={selectedOutfit || ""} onValueChange={(val) => setSelectedOutfit(val || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an outfit" />
                  </SelectTrigger>
                  <SelectContent>
                    {outfits.map((outfit) => (
                      <SelectItem key={outfit.id} value={outfit.id}>
                        {outfit.name} ({outfit.items?.length || 0} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
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
            )}

            {logMode === "items" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-as-outfit"
                    checked={saveAsOutfit}
                    onChange={(e) => setSaveAsOutfit(e.target.checked)}
                    className="w-4 h-4 rounded border accent-primary"
                  />
                  <Label htmlFor="save-as-outfit" className="cursor-pointer">
                    Save as new outfit
                  </Label>
                </div>
                {saveAsOutfit && (
                  <Input
                    value={outfitName}
                    onChange={(e) => setOutfitName(e.target.value)}
                    placeholder="Enter outfit name..."
                  />
                )}
              </div>
            )}

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
                disabled={
                  saving ||
                  (logMode === "outfit" && !selectedOutfit) ||
                  (logMode === "items" && selectedItems.size === 0)
                }
              >
                {saving ? "Saving..." : "Save Log"}
              </Button>
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
