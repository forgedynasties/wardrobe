"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { imageUrl } from "@/lib/api";
import type { Outfit } from "@/lib/types";

interface OutfitCardProps {
  outfit: Outfit;
}

const categoryOrder = ["Outerwear", "Top", "Bottom", "Shoes", "Accessory"];

export function OutfitCard({ outfit }: OutfitCardProps) {
  const sortedItems = outfit.items
    ? [...outfit.items].sort(
        (a, b) =>
          categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category),
      )
    : [];

  return (
    <Link href={`/outfits/${outfit.id}`}>
      <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer hover:shadow-md">
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
                        className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
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
          <h3 className="font-semibold text-sm truncate">{outfit.name}</h3>
          <div className="text-xs text-muted-foreground">
            {outfit.items?.length || 0} items &middot; {outfit.usage_count} wear{outfit.usage_count !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>
    </Link>
  );
}
