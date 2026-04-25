"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { getItemsPage } from "@/lib/api";
import { CategoryStrip } from "@/components/category-strip";
import { ItemGrid } from "@/components/item-grid";
import { AddItemButton } from "@/components/add-item-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/user-context";
import type { ClothingItem } from "@/lib/types";

const CATEGORIES = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];
const PAGE_SIZE = 100;

export default function WardrobePage() {
  const { user, hydrated } = useUser();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [focusCategory, setFocusCategory] = useState<string | null>(null);

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
    ? items.filter((i) => i.category === focusCategory)
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
            Wardrobe
          </button>
        ) : (
          <h1 className="text-2xl font-bold">Wardrobe</h1>
        )}
        <AddItemButton />
      </div>

      {focusCategory && (
        <h2 className="text-xl font-semibold mb-4">{focusCategory}</h2>
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
          {CATEGORIES.map((cat) => (
            <CategoryStrip
              key={cat}
              category={cat}
              items={items.filter((i) => i.category === cat)}
              onSeeAll={() => setFocusCategory(cat)}
            />
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg font-medium text-foreground mb-1">Your wardrobe is empty</p>
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
