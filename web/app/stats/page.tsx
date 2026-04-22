"use client";

import { useEffect, useState } from "react";
import { getWardrobeStats, imageUrl, getItems, getOutfits } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WardrobeStats, ClothingItem } from "@/lib/types";

export default function StatsPage() {
  const [stats, setStats] = useState<WardrobeStats | null>(null);
  const [neverWornItems, setNeverWornItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamically calculate stats from items and outfits
  const calculateStats = async () => {
    try {
      const [itemsData, outfitsData, apiStats] = await Promise.all([
        getItems(),
        getOutfits(),
        getWardrobeStats(),
      ]);

      // Calculate basic stats from local data
      const calculatedStats = { ...apiStats };
      
      // Items statistics
      calculatedStats.total_items = itemsData.length;
      const neverWorn = itemsData.filter((item) => !item.last_worn);
      calculatedStats.never_worn_items = neverWorn.length;
      
      // Outfits statistics
      calculatedStats.total_outfits = outfitsData.length;
      calculatedStats.never_worn_outfits = outfitsData.filter(outfit => !outfit.last_worn).length;
      calculatedStats.total_wears = outfitsData.reduce((sum, o) => sum + o.usage_count, 0);
      calculatedStats.avg_wears_per_outfit = outfitsData.length > 0 
        ? outfitsData.reduce((sum, o) => sum + o.usage_count, 0) / outfitsData.length
        : 0;

      // Items by category (dynamically calculated)
      const categoryMap: { [key: string]: number } = {};
      itemsData.forEach(item => {
        categoryMap[item.category] = (categoryMap[item.category] || 0) + 1;
      });
      calculatedStats.items_by_category = Object.entries(categoryMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => a.category.localeCompare(b.category));

      setStats(calculatedStats);
      setNeverWornItems(neverWorn);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateStats();

    // Reload stats when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        calculateStats();
      }
    };

    // Poll for updates every 3 seconds while page is visible
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        calculateStats();
      }
    }, 3000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Stats</h1>
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Wardrobe Stats</h1>
        <p className="text-muted-foreground">Insights into your wardrobe and wearing patterns</p>
      </div>

      {/* Wardrobe Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Wardrobe Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Items</p>
            <p className="text-3xl font-bold">{stats.total_items}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Outfits</p>
            <p className="text-3xl font-bold">{stats.total_outfits}</p>
          </Card>
        </div>

        {/* Items by Category */}
        {stats.items_by_category.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Items by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.items_by_category.map((cat) => (
                <Card key={cat.category} className="p-4 flex items-center justify-between">
                  <span className="font-medium capitalize">{cat.category}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-6 bg-muted/50 rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/70 transition-all"
                        style={{
                          width: `${(cat.count / (stats.total_items || 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-right min-w-8">{cat.count}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outfit Stats */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Outfit Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Wears</p>
            <p className="text-3xl font-bold">{stats.total_wears}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Avg Wears/Outfit</p>
            <p className="text-3xl font-bold">{stats.avg_wears_per_outfit.toFixed(1)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-1">This Month</p>
            <p className="text-3xl font-bold">{stats.wears_this_month}</p>
          </Card>
        </div>
      </div>

      {/* Color Palette */}
      {stats.colors.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Color Palette</h2>
          <Card className="p-6">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {stats.colors.map((color) => (
                <div key={color} className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: color || "#999" }}
                    title={color}
                  />
                  <span className="text-xs text-muted-foreground text-center font-mono">
                    {color.slice(1).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Top Worn Items */}
      {stats.top_worn_items.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Top Worn Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.top_worn_items.map((topItem) => {
              const item = topItem.item;
              const imgSrc =
                item.image_status === "done" && item.image_url
                  ? imageUrl(item.image_url)
                  : item.raw_image_url
                    ? imageUrl(item.raw_image_url)
                    : null;

              return (
                <Card
                  key={item.id}
                  className="overflow-hidden flex flex-col"
                >
                  <div className="aspect-square bg-muted/50 flex items-center justify-center relative">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={item.category}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-4xl">👕</div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-semibold">
                      {topItem.wear_count} wears
                    </div>
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="font-medium capitalize">{item.category}</p>
                    {item.sub_category && (
                      <p className="text-xs text-muted-foreground capitalize">{item.sub_category}</p>
                    )}
                    {item.colors && item.colors.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {item.colors.map((c, ci) => (
                          <div key={ci} className="flex items-center gap-1">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: c }}
                            />
                            <span className="text-xs">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {neverWornItems.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Never Worn Items</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {stats.never_worn_items} item{stats.never_worn_items === 1 ? "" : "s"} still waiting for a first wear.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {neverWornItems.map((item) => {
              const imgSrc =
                item.image_status === "done" && item.image_url
                  ? imageUrl(item.image_url)
                  : item.raw_image_url
                    ? imageUrl(item.raw_image_url)
                    : null;

              return (
                <Card key={item.id} className="overflow-hidden flex flex-col">
                  <div className="aspect-square bg-muted/50 flex items-center justify-center">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={item.category}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-4xl">👕</div>
                    )}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="font-medium capitalize">{item.category}</p>
                    {item.sub_category && (
                      <p className="text-xs text-muted-foreground capitalize">{item.sub_category}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">Never worn</p>
                    {item.colors && item.colors.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {item.colors.map((c, ci) => (
                          <div key={ci} className="flex items-center gap-1">
                            <div
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: c }}
                            />
                            <span className="text-xs">{c}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-3">Ideas To Add Next</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="font-medium">Cost per wear</p>
            <p className="text-sm text-muted-foreground mt-1">
              Show which pieces are giving the best value once purchase price is tracked.
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-medium">Most repeated combinations</p>
            <p className="text-sm text-muted-foreground mt-1">
              Highlight the pairs or full outfits you reach for most often.
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-medium">Seasonal usage</p>
            <p className="text-sm text-muted-foreground mt-1">
              Break down which categories and colors dominate each month or season.
            </p>
          </Card>
          <Card className="p-4">
            <p className="font-medium">Neglected favorites</p>
            <p className="text-sm text-muted-foreground mt-1">
              Find items that used to get worn a lot but have recently dropped off.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
