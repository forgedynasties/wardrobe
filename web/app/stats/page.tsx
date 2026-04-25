"use client";

import { useEffect, useState } from "react";
import { getWardrobeStats, imageUrl, getItems } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Shirt, Sparkles, Palette, Trophy, PackageX, TrendingUp, Tag } from "lucide-react";
import type { WardrobeStats, ClothingItem } from "@/lib/types";

export default function StatsPage() {
  const [stats, setStats] = useState<WardrobeStats | null>(null);
  const [neverWornItems, setNeverWornItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      const [itemsData, apiStats] = await Promise.all([
        getItems(),
        getWardrobeStats(),
      ]);
      setStats(apiStats);
      setNeverWornItems(itemsData.filter((item) => !item.last_worn));
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Wardrobe Stats</h1>
          <p className="text-muted-foreground">Insights into your wardrobe and wearing patterns</p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadStats} className="gap-1.5 mt-1">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Wardrobe Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Shirt className="h-5 w-5 text-muted-foreground" />Wardrobe Overview</h2>
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
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Tag className="h-4 w-4 text-muted-foreground" />Items by Category</h3>
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
        <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-muted-foreground" />Outfit Statistics</h2>
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
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Palette className="h-5 w-5 text-muted-foreground" />Color Palette</h2>
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
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><Trophy className="h-5 w-5 text-muted-foreground" />Top Worn Items</h2>
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
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2"><PackageX className="h-5 w-5 text-muted-foreground" />Never Worn Items</h2>
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

    </div>
  );
}
