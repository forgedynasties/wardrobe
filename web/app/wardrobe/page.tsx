"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Plus, ArrowUpDown } from "lucide-react";
import { getItemsPage, getOutfitsPage } from "@/lib/api";
import { outfitRefreshStore } from "@/lib/outfit-refresh";
import { CategoryStrip } from "@/components/category-strip";
import { ItemGrid } from "@/components/item-grid";
import { OutfitCard } from "@/components/outfit-card";
import { OutfitStats } from "@/components/outfit-stats";
import { AddItemButton } from "@/components/add-item-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/lib/user-context";
import type { ClothingItem, Outfit } from "@/lib/types";

type ItemSortBy = "default" | "color";
type OutfitSortOption = "recent" | "most-worn" | "least-worn" | "last-worn" | "never-worn";

const CATEGORIES = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];
const ITEMS_PAGE_SIZE = 100;
const OUTFITS_PAGE_SIZE = 20;

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

function sortItems(items: ClothingItem[], sort: ItemSortBy): ClothingItem[] {
  if (sort === "color") {
    return [...items].sort((a, b) => {
      const ha = a.colors?.[0] ? hexToHue(a.colors[0]) : 361;
      const hb = b.colors?.[0] ? hexToHue(b.colors[0]) : 361;
      return ha - hb;
    });
  }
  return items;
}

function ItemsTab() {
  const { user, hydrated } = useUser();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [focusCategory, setFocusCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ItemSortBy>("default");

  useEffect(() => {
    if (!hydrated || !user) return;
    setLoading(true);
    getItemsPage(ITEMS_PAGE_SIZE)
      .then((page) => {
        setItems(page.data);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoading(false));
  }, [hydrated, user]);

  useEffect(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    getItemsPage(ITEMS_PAGE_SIZE, nextCursor)
      .then((page) => {
        setItems((prev) => [...prev, ...page.data]);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoadingMore(false));
  }, [nextCursor]);

  const focusItems = focusCategory
    ? sortItems(items.filter((i) => i.category === focusCategory), sortBy)
    : [];

  if (!user) return null;

  return (
    <>
      {focusCategory && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{focusCategory}</h2>
          <div className="flex items-center gap-1 rounded-md border p-0.5 bg-muted/40 text-xs">
            {(["default", "color"] as ItemSortBy[]).map((s) => (
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
    </>
  );
}

function OutfitsTab() {
  const refreshVersion = useSyncExternalStore(
    outfitRefreshStore.subscribe,
    outfitRefreshStore.getSnapshot,
    () => 0,
  );

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<OutfitSortOption>("recent");

  useEffect(() => {
    setLoading(true);
    getOutfitsPage(OUTFITS_PAGE_SIZE)
      .then((page) => {
        setOutfits(page.data);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoading(false));
  }, [refreshVersion]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getOutfitsPage(OUTFITS_PAGE_SIZE, nextCursor);
      setOutfits((prev) => [...prev, ...page.data]);
      setNextCursor(page.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const sortedOutfits = [...outfits].sort((a, b) => {
    switch (sortBy) {
      case "most-worn":
        return b.usage_count - a.usage_count;
      case "least-worn":
        return a.usage_count - b.usage_count;
      case "last-worn":
        return (
          new Date(b.last_worn || 0).getTime() -
          new Date(a.last_worn || 0).getTime()
        );
      case "never-worn":
        return (
          Number(a.last_worn === null) - Number(b.last_worn === null)
        );
      case "recent":
      default:
        return (
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
        );
    }
  });

  return (
    <>
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      ) : outfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8" />
          </div>
          <p className="text-lg font-medium text-foreground mb-1">No outfits yet</p>
          <p className="text-sm mb-6">Combine items into outfits to track what you wear</p>
          <Link href="/outfits/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create first outfit
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <OutfitStats outfits={outfits} />

          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium flex items-center gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" />Sort by:</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as OutfitSortOption)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Created</SelectItem>
                <SelectItem value="most-worn">Most Worn</SelectItem>
                <SelectItem value="least-worn">Least Worn</SelectItem>
                <SelectItem value="last-worn">Recently Worn</SelectItem>
                <SelectItem value="never-worn">Never Worn</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sortedOutfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>

          {nextCursor && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {!loading && outfits.length > 0 && (
        <Link href="/outfits/new" className="fixed bottom-20 right-4 z-40 md:hidden">
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
            <Plus className="h-6 w-6" />
          </Button>
        </Link>
      )}
    </>
  );
}

export default function WardrobePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") || "items";

  const TABS = [
    { key: "items", label: "Items" },
    { key: "outfits", label: "Outfits" },
  ];

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Wardrobe</h1>
        {tab === "items" ? (
          <AddItemButton />
        ) : (
          <Link href="/outfits/new">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </Link>
        )}
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/wardrobe?tab=${t.key}`)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "items" ? <ItemsTab /> : <OutfitsTab />}
    </div>
  );
}
