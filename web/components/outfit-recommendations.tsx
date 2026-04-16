"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { imageUrl } from "@/lib/api";
import type { OutfitRecommendation } from "@/lib/types";

interface Props {
  recommendations: OutfitRecommendation[];
}

const categoryOrder = ["Outerwear", "Top", "Bottom", "Shoes", "Accessory"];

export function OutfitRecommendations({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Recommended for you</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {recommendations.map((rec) => {
          const sortedItems = rec.items
            ? [...rec.items].sort(
                (a, b) =>
                  categoryOrder.indexOf(a.category) -
                  categoryOrder.indexOf(b.category),
              )
            : [];
          return (
            <Link key={rec.id} href={`/outfits/${rec.id}`}>
              <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer">
                <div className="aspect-[3/4] bg-muted/30 flex items-center justify-center relative overflow-hidden">
                  {sortedItems.length > 0 ? (
                    <div className="flex flex-col items-center justify-center w-full h-full py-4">
                      {sortedItems.map((item, idx) => {
                        const src =
                          item.image_status === "done" && item.image_url
                            ? imageUrl(item.image_url)
                            : item.raw_image_url
                              ? imageUrl(item.raw_image_url)
                              : null;
                        return (
                          <div
                            key={idx}
                            className="flex-1 w-3/4 flex items-center justify-center min-h-0"
                            style={{ marginTop: idx > 0 ? "-12%" : 0 }}
                          >
                            {src ? (
                              <img
                                src={src}
                                alt={item.category}
                                className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <span className="text-xl text-muted-foreground/50">👕</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-3xl text-muted-foreground/30">✨</span>
                  )}
                </div>
                <div className="px-3 py-2.5 space-y-1.5">
                  <h3 className="font-semibold text-sm truncate">{rec.name}</h3>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {rec.reason}
                  </Badge>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
