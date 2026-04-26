"use client";

import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
import { outfitRefreshStore } from "@/lib/outfit-refresh";
import Link from "next/link";
import { Plus, Sparkles, ArrowUpDown } from "lucide-react";
import { getOutfitsPage, getOutfitRecommendations, getOutfitSuggestions } from "@/lib/api";
import { OutfitCard } from "@/components/outfit-card";
import { OutfitStats } from "@/components/outfit-stats";
import { OutfitRecommendations } from "@/components/outfit-recommendations";
import { OutfitSuggestions } from "@/components/outfit-suggestions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outfit, OutfitRecommendation, OutfitSuggestion } from "@/lib/types";

type SortOption = "recent" | "most-worn" | "least-worn" | "last-worn" | "never-worn";

export default function OutfitsPage() {
  const refreshVersion = useSyncExternalStore(
    outfitRefreshStore.subscribe,
    outfitRefreshStore.getSnapshot,
    () => 0,
  );

  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [recommendations, setRecommendations] = useState<OutfitRecommendation[]>([]);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    setLoading(true);
    Promise.all([getOutfitsPage(20), getOutfitRecommendations(5), getOutfitSuggestions(3)])
      .then(([page, recs, sugs]) => {
        setOutfits(page.data);
        setNextCursor(page.next_cursor);
        setRecommendations(recs);
        setSuggestions(sugs);
      })
      .finally(() => setLoading(false));
  }, [refreshVersion]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getOutfitsPage(20, nextCursor);
      setOutfits((prev) => [...prev, ...page.data]);
      setNextCursor(page.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const handleShuffle = () => {
    getOutfitSuggestions(3).then(setSuggestions);
  };

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
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Outfits</h1>
        <Link href="/outfits/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </Link>
      </div>

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

          <OutfitRecommendations recommendations={recommendations} />

          <OutfitSuggestions suggestions={suggestions} onRefresh={handleShuffle} />

          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium flex items-center gap-1.5"><ArrowUpDown className="h-3.5 w-3.5" />Sort by:</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
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
    </div>
  );
}
