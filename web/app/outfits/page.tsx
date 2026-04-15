"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOutfits } from "@/lib/api";
import { OutfitCard } from "@/components/outfit-card";
import { OutfitStats } from "@/components/outfit-stats";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outfit } from "@/lib/types";

type SortOption = "recent" | "most-worn" | "least-worn" | "last-worn" | "never-worn";

export default function OutfitsPage() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  useEffect(() => {
    getOutfits()
      .then(setOutfits)
      .finally(() => setLoading(false));
  }, []);

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

  // Calculate stats
  const stats = {
    total: outfits.length,
    mostWorn: outfits.length > 0 ? Math.max(...outfits.map(o => o.usage_count)) : 0,
    avgWears: outfits.length > 0 ? Math.round(outfits.reduce((sum, o) => sum + o.usage_count, 0) / outfits.length) : 0,
    neverWorn: outfits.filter(o => !o.last_worn).length,
  };

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Outfits</h1>
        <Link href="/outfits/new">
          <Button size="sm">+ Create</Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="text-muted-foreground animate-pulse">
            Loading...
          </span>
        </div>
      ) : outfits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="text-5xl mb-4">✨</span>
          <p className="text-lg">No outfits yet</p>
          <p className="text-sm">Create your first outfit to get started</p>
        </div>
      ) : (
        <>
          <OutfitStats outfits={outfits} />

          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">Sort by:</span>
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
        </>
      )}
    </div>
  );
}
