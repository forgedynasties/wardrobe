"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ClothingItem } from "@/lib/types";
import { imageUrl } from "@/lib/api";

interface ItemCardProps {
  item: ClothingItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const src =
    item.image_status === "done" && item.image_url
      ? imageUrl(item.image_url)
      : item.raw_image_url
        ? imageUrl(item.raw_image_url)
        : null;

  return (
    <Link href={`/items/${item.id}`}>
      <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer hover:shadow-md">
        <div className="aspect-square bg-card flex items-center justify-center relative">
          {src ? (
            <img
              src={src}
              alt={`${item.category} ${item.sub_category}`}
              className="object-contain w-full h-full p-3 transition-transform duration-200"
              style={{ transform: `scale(${item.display_scale ?? 1})` }}
            />
          ) : (
            <span className="text-4xl text-muted-foreground/50">
              {item.category === "Shoes" ? "👟" : item.category === "Accessory" ? "🎒" : "👕"}
            </span>
          )}
          {item.image_status === "processing" && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">
                Processing...
              </span>
            </div>
          )}
          {item.colors && item.colors.length > 0 && (
            <div className="absolute top-2 right-2 flex -space-x-1">
              {item.colors.slice(0, 3).map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">
            {item.sub_category || item.category}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {item.sub_category ? item.category : item.material || "\u00A0"}
          </p>
        </div>
      </Card>
    </Link>
  );
}
