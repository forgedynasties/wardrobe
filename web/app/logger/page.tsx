"use client";

import { useEffect, useState } from "react";
import { getOutfitLogs, getOutfits, logOutfitWear, getItems, deleteOutfitLog, imageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outfit, ClothingItem, OutfitLog } from "@/lib/types";
import { createOutfit } from "@/lib/api";

export default function OutfitLoggerPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [logs, setLogs] = useState<Map<string, OutfitLog>>(new Map());
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logMode, setLogMode] = useState<"outfit" | "items">("outfit");
  const [selectedOutfit, setSelectedOutfit] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveAsOutfit, setSaveAsOutfit] = useState(false);
  const [outfitName, setOutfitName] = useState("");

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
          // Extract date part from wear_date (e.g., "2024-01-15" from "2024-01-15T00:00:00Z")
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
    setShowLogDialog(true);
  };

  const handleSaveLog = async () => {
    if (!selectedDate) return;

    setSaving(true);
    setSaveError(null);
    try {
      // Format as RFC3339 datetime (midnight UTC for the selected date)
      const wearDate = new Date(selectedDate);
      wearDate.setHours(0, 0, 0, 0);
      const dateString = wearDate.toISOString(); // "2024-01-15T00:00:00.000Z"
      
      // Validate that we have either outfit or items selected
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

      // Create outfit first if requested in items mode
      if (logMode === "items" && saveAsOutfit) {
        if (!outfitName.trim()) {
          setSaveError("Please enter an outfit name");
          setSaving(false);
          return;
        }

        const newOutfit = await createOutfit({
          name: outfitName,
        });
        outfitIdToLog = newOutfit.id;
        
        // Add items to the new outfit
        for (const itemId of Array.from(selectedItems)) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081"}/api/outfits/${newOutfit.id}/items`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ clothing_item_id: itemId }),
            });
          } catch (err) {
            console.error("Failed to add item to outfit:", err);
          }
        }
      }

      const requestData: any = {
        wear_date: dateString,
      };

      // Only include optional fields if they have values
      if (outfitIdToLog) {
        requestData.outfit_id = outfitIdToLog;
      }
      if (logMode === "items" && selectedItems.size > 0 && !saveAsOutfit) {
        requestData.item_ids = Array.from(selectedItems);
      }
      if (notes) {
        requestData.notes = notes;
      }

      console.log("Sending log request:", requestData);

      const response = await logOutfitWear(requestData);
      console.log("Log saved:", response);

      // Reset form and reload
      setSelectedOutfit("");
      setSelectedItems(new Set());
      setNotes("");
      setSaveAsOutfit(false);
      setOutfitName("");
      setShowLogDialog(false);
      setSaveError(null);
      await loadMonthLogs();
      await loadData(); // Refresh outfits list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save log";
      console.error("Error saving log:", err);
      setSaveError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (logDate: string) => {
    const log = logs.get(logDate);
    if (!log || !confirm("Delete this log entry?")) return;

    try {
      await deleteOutfitLog(log.id);
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
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthName = currentMonth.toLocaleString("default", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="text-muted-foreground animate-pulse">Loading...</span>
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
          variant="outline"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
        >
          ← Previous
        </Button>
        <h2 className="text-xl font-semibold">{monthName}</h2>
        <Button
          variant="outline"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
        >
          Next →
        </Button>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-semibold text-sm">
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
                className={`min-h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all p-2 ${
                  !day
                    ? "bg-muted/30"
                    : hasLog
                      ? "bg-primary/20 border-primary hover:bg-primary/30"
                      : "bg-card border-border hover:border-primary"
                }`}
                onClick={() => day && handleDateClick(day)}
              >
                {day && (
                  <>
                    <div className="text-sm font-medium mb-1">{day}</div>
                    {hasLog && log && (
                      <div className="flex flex-col items-center gap-2 w-full flex-1">
                        {/* Display item thumbnails only */}
                        <div className="flex gap-2 flex-wrap justify-center w-full items-center min-h-6">
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
                                  className="w-10 h-10 rounded-md object-cover border border-muted/50 shadow-sm"
                                  onError={(e: any) => {
                                    if (e.currentTarget) {
                                      e.currentTarget.style.display = "none";
                                    }
                                  }}
                                />
                              ) : null;
                            })
                          ) : null}
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(dateStr);
                          }}
                          className="text-muted-foreground hover:text-destructive text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {saveError && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm mt-4">
            {saveError}
          </div>
        )}
      </Card>

      {showLogDialog && selectedDate && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Log outfit for {selectedDate.toLocaleDateString()}
            </h3>
            <button
              onClick={() => {
                setShowLogDialog(false);
                setSelectedItems(new Set());
                setSaveAsOutfit(false);
                setOutfitName("");
                setSaveError(null);
              }}
              className="text-2xl hover:text-muted-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Log Type</Label>
              <div className="flex gap-2">
                <Button
                  variant={logMode === "outfit" ? "default" : "outline"}
                  onClick={() => setLogMode("outfit")}
                >
                  Existing Outfit
                </Button>
                <Button
                  variant={logMode === "items" ? "default" : "outline"}
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
                <Label>Select Items</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
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
                            ? "bg-primary/20 border-primary"
                            : "bg-muted border-border hover:border-primary"
                        }`}
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={item.category}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 p-2">
                            <div className="text-lg">👕</div>
                            <div className="text-xs font-medium">{item.category}</div>
                            {item.sub_category && (
                              <div className="text-xs text-muted-foreground">{item.sub_category}</div>
                            )}
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
                    className="w-4 h-4 rounded border"
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
                    className="w-full"
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

            <div className="flex gap-2">
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
                onClick={() => {
                  setShowLogDialog(false);
                  setSelectedItems(new Set());
                  setSaveAsOutfit(false);
                  setOutfitName("");
                  setSaveError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
