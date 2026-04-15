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
      <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer hover:shadow-md">
        <div className="aspect-square bg-muted/30 flex items-center justify-center relative overflow-hidden">
          <div className="grid grid-cols-2 gap-1.5 p-3 w-full h-full">
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
                    className="bg-muted/50 rounded-md flex items-center justify-center aspect-square overflow-hidden"
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={item.category}
                        className="w-full h-full object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <span className="text-xl text-muted-foreground/50">👕</span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="col-span-2 flex items-center justify-center">
                <span className="text-3xl text-muted-foreground/30">✨</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          <h3 className="font-semibold text-sm truncate">{outfit.name}</h3>
          <div className="flex gap-1 flex-wrap">
            {outfit.season && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {outfit.season}
              </Badge>
            )}
            {outfit.vibe && outfit.vibe.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {outfit.vibe[0]}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {outfit.items?.length || 0} items &middot; {outfit.usage_count} wear{outfit.usage_count !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>
    </Link>
  );
}
