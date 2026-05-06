"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { getItemsPage } from "@/lib/api";
import { CategoryStrip } from "@/components/category-strip";
import { ItemGrid } from "@/components/item-grid";
import { AddItemButton } from "@/components/add-item-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/user-context";
import type { ClothingItem } from "@/lib/types";

type SortBy = "default" | "color";

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0)
          : max === g ? (b - r) / d + 2
          : (r - g) / d + 4;
  return h * 60;
}

function sortItems(items: ClothingItem[], sort: SortBy): ClothingItem[] {
  if (sort === "color") {
    return [...items].sort((a, b) => {
      const ha = a.colors?.[0] ? hexToHue(a.colors[0]) : 361;
      const hb = b.colors?.[0] ? hexToHue(b.colors[0]) : 361;
      return ha - hb;
    });
  }
  return items;
}

const CATEGORIES = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];
const PAGE_SIZE = 100;

export default function HangurPage() {
  const { user, hydrated } = useUser();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [focusCategory, setFocusCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("default");

  useEffect(() => {
    if (!hydrated || !user) return;
    setLoading(true);
    getItemsPage(PAGE_SIZE)
      .then((page) => {
        setItems(page.data);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoading(false));
  }, [hydrated, user]);

  // Auto-load remaining pages so strips show full counts
  useEffect(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    getItemsPage(PAGE_SIZE, nextCursor)
      .then((page) => {
        setItems((prev) => [...prev, ...page.data]);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoadingMore(false));
  }, [nextCursor]);

  const focusItems = focusCategory
    ? sortItems(items.filter((i) => i.category === focusCategory), sortBy)
    : [];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        {focusCategory ? (
          <button
            onClick={() => setFocusCategory(null)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Hangur
          </button>
        ) : (
          <h1 className="text-2xl font-bold">My Hangur</h1>
        )}
        <AddItemButton />
      </div>

      {focusCategory && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{focusCategory}</h2>
          <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40 text-xs">
            {(["default", "color"] as SortBy[]).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 rounded capitalize transition-colors font-medium ${
                  sortBy === s
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "color" ? "Color" : "Default"}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex items-center gap-1.5 mb-4 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          Never worn
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : focusCategory ? (
        <ItemGrid items={focusItems} />
      ) : (
        <div className="space-y-8">
          <Link
            href="/image-guide"
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Adding clothes with AI</p>
                <p className="text-xs text-muted-foreground">Use Gemini + remove.bg to prep your images</p>
              </div>
            </div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {CATEGORIES.map((cat) => (
            <CategoryStrip
              key={cat}
              category={cat}
              items={items.filter((i) => i.category === cat)}
              onSeeAll={() => { setFocusCategory(cat); setSortBy("default"); }}
            />
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg font-medium text-foreground mb-1">Your hangur is empty</p>
              <p className="text-sm mb-6">Add your first clothing item to get started</p>
              <AddItemButton />
            </div>
          )}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="fixed bottom-20 right-4 z-40 md:hidden">
          <AddItemButton variant="fab" />
        </div>
      )}
    </div>
  );
}
