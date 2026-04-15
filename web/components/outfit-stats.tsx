"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Outfit } from "@/lib/types";

interface OutfitStatsProps {
  outfits: Outfit[];
}

export function OutfitStats({ outfits }: OutfitStatsProps) {
  const stats = {
    total: outfits.length,
    totalWears: outfits.reduce((sum, o) => sum + o.usage_count, 0),
    avgWears: outfits.length > 0 ? Math.round(outfits.reduce((sum, o) => sum + o.usage_count, 0) / outfits.length) : 0,
    neverWorn: outfits.filter(o => !o.last_worn).length,
    mostWorn: outfits.length > 0 ? outfits.reduce((max, o) => o.usage_count > max.usage_count ? o : max) : null,
    leastWorn: outfits.filter(o => o.usage_count > 0).length > 0 
      ? outfits.filter(o => o.usage_count > 0).reduce((min, o) => o.usage_count < min.usage_count ? o : min)
      : null,
    needsWear: outfits
      .filter(o => !o.last_worn || new Date(o.last_worn).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000)
      .sort((a, b) => (a.last_worn ? new Date(a.last_worn).getTime() : 0) - (b.last_worn ? new Date(b.last_worn).getTime() : 0))
      .slice(0, 3),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Total Outfits</div>
        <div className="text-2xl font-bold">{stats.total}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Total Wears</div>
        <div className="text-2xl font-bold">{stats.totalWears}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Avg Wears</div>
        <div className="text-2xl font-bold">{stats.avgWears}</div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-muted-foreground mb-1">Not Worn</div>
        <div className="text-2xl font-bold">{stats.neverWorn}</div>
      </Card>

      {stats.mostWorn && (
        <Card className="p-4 md:col-span-2">
          <div className="text-xs text-muted-foreground mb-2">Most Worn</div>
          <div className="font-semibold truncate">{stats.mostWorn.name}</div>
          <div className="text-sm text-muted-foreground">{stats.mostWorn.usage_count} wears</div>
        </Card>
      )}

      {stats.leastWorn && (
        <Card className="p-4 md:col-span-2">
          <div className="text-xs text-muted-foreground mb-2">Least Worn</div>
          <div className="font-semibold truncate">{stats.leastWorn.name}</div>
          <div className="text-sm text-muted-foreground">{stats.leastWorn.usage_count} wears</div>
        </Card>
      )}

      {stats.needsWear.length > 0 && (
        <Card className="p-4 md:col-span-4">
          <div className="text-xs text-muted-foreground mb-3">💡 Needs a Rotation</div>
          <div className="flex flex-wrap gap-2">
            {stats.needsWear.map((outfit) => (
              <Badge key={outfit.id} variant="outline" className="text-xs">
                {outfit.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
