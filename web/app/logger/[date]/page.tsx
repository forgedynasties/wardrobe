"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getItems, getOutfitLogByDate, logOutfitWear, updateOutfitLog, deleteOutfitLog, imageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ShimmerImg } from "@/components/shimmer-img";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ClothingItem, OutfitLog, LogOutfitWearRequest } from "@/lib/types";

const CATEGORY_WEIGHT: Record<string, number> = {
  outerwear: 5,
  top: 4,
  bottom: 3,
  shoes: 2,
  accessory: 1,
};

function sortByCategory(items: ClothingItem[]) {
  return [...items].sort(
    (a, b) =>
      (CATEGORY_WEIGHT[b.category?.toLowerCase() ?? ""] ?? 0) -
      (CATEGORY_WEIGHT[a.category?.toLowerCase() ?? ""] ?? 0),
  );
}

function itemImgSrc(item: ClothingItem): string | null {
  if (item.image_status === "done" && item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return null;
}

export default function LogDayPage() {
  const params = useParams();
  const router = useRouter();
  const dateStr = params.date as string; // "2026-04-26"

  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dateLabel = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const [items, setItems] = useState<ClothingItem[]>([]);
  const [existingLog, setExistingLog] = useState<OutfitLog | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState("All");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [allItems, log] = await Promise.all([
          getItems(),
          getOutfitLogByDate(dateStr).catch(() => null),
        ]);
        const sorted = sortByCategory(allItems);
        setItems(sorted);
        if (log) {
          setExistingLog(log);
          setSelectedItems(new Set((log.items || []).map((i) => i.id)));
          setNotes(log.notes ?? "");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dateStr]);

  const toggleItem = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedItems.size === 0 && !existingLog) {
      setSaveError("Select at least one item");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      if (existingLog) {
        await updateOutfitLog(existingLog.id, {
          notes,
          item_ids: Array.from(selectedItems),
        });
      } else {
        const req: LogOutfitWearRequest = {
          wear_date: `${dateStr}T00:00:00Z`,
          item_ids: Array.from(selectedItems),
        };
        if (notes) req.notes = notes;
        await logOutfitWear(req);
      }
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingLog) return;
    setDeleting(true);
    try {
      await deleteOutfitLog(existingLog.id);
      router.back();
    } catch {
      setDeleting(false);
    }
  };

  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category))).sort()];
  const visibleItems = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);

  if (loading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-4 gap-2 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      {/* header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold leading-tight">{dateLabel}</h1>
          <p className="text-sm text-muted-foreground">
            {existingLog ? "Edit log" : "Log outfit"}
          </p>
        </div>
        {existingLog && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto text-destructive hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* category filter */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 flex-1">
          {categories.map((cat) => {
            const count =
              cat === "All"
                ? selectedItems.size
                : items.filter((i) => i.category === cat && selectedItems.has(i.id)).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {cat}
                {count > 0 && cat !== "All" ? ` · ${count}` : ""}
              </button>
            );
          })}
        </div>
        {selectedItems.size > 0 && (
          <button
            onClick={() => setSelectedItems(new Set())}
            className="flex-shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear {selectedItems.size}
          </button>
        )}
      </div>

      {/* item grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {visibleItems.map((item) => {
          const src = itemImgSrc(item);
          const isSelected = selectedItems.has(item.id);
          return (
            <button
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`relative aspect-square rounded-xl border-2 transition-all overflow-hidden ${
                isSelected
                  ? "bg-primary/15 border-primary"
                  : "bg-muted/50 border-border hover:border-primary/50"
              }`}
            >
              {src ? (
                <ShimmerImg
                  src={src}
                  alt={item.category}
                  className="w-full h-full object-contain p-1.5"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xl">
                  {item.category === "Shoes" ? "👟" : "👕"}
                </div>
              )}
              {isSelected && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold shadow">
                  ✓
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-1 py-0.5">
                <p className="text-[8px] text-white font-medium truncate text-center leading-tight">
                  {item.sub_category || item.category}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* notes */}
      <Input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
      />

      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      {/* actions */}
      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSave}
          disabled={saving || (selectedItems.size === 0 && !existingLog)}
        >
          {saving ? "Saving…" : existingLog ? "Update" : "Save"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete log entry</DialogTitle>
            <DialogDescription>
              Remove the outfit log for {dateLabel}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
