"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { imageUrl } from "@/lib/api";
import type { Outfit } from "@/lib/types";

interface OutfitCardProps {
  outfit: Outfit;
}

export function OutfitCard({ outfit }: OutfitCardProps) {
  return (
    <Link href={`/outfits/${outfit.id}`}>
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
        <div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center relative group overflow-hidden">
          <div className="grid grid-cols-2 gap-2 p-4 w-full h-full">
            {outfit.items && outfit.items.length > 0 ? (
              outfit.items.slice(0, 4).map((item, idx) => {
                const src =
                  item.image_status === "done" && item.image_url
                    ? imageUrl(item.image_url)
                    : item.raw_image_url
                      ? imageUrl(item.raw_image_url)
                      : null;

                return (
                  <div
                    key={idx}
                    className="bg-muted rounded flex items-center justify-center aspect-square overflow-hidden"
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={item.category}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-2xl">👕</span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 flex items-center justify-center">
                <span className="text-4xl text-muted-foreground">✨</span>
              </div>
            )}
          </div>
        </div>
        <div className="p-3 space-y-2">
          <h3 className="font-semibold truncate">{outfit.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {outfit.season && (
              <Badge variant="secondary" className="text-xs">
                {outfit.season}
              </Badge>
            )}
            {outfit.vibe && outfit.vibe.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {outfit.vibe[0]}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>{outfit.items?.length || 0} items • {outfit.usage_count} wears</div>
            {outfit.last_worn ? (
              <div>
                Last worn {new Date(outfit.last_worn).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            ) : (
              <div className="text-orange-600/70 font-medium">Never worn</div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
