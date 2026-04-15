"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <Card className="overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
        <div className="aspect-square bg-muted flex items-center justify-center relative">
          {src ? (
            <img
              src={src}
              alt={`${item.category} ${item.sub_category}`}
              className="object-contain w-full h-full p-2"
            />
          ) : (
            <span className="text-4xl text-muted-foreground">👕</span>
          )}
          {item.image_status === "processing" && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="text-sm text-muted-foreground animate-pulse">
                Processing...
              </span>
            </div>
          )}
        </div>
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {item.category}
            </Badge>
            {item.sub_category && (
              <span className="text-xs text-muted-foreground truncate">
                {item.sub_category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.color_hex && (
              <div
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: item.color_hex }}
              />
            )}
            {item.material && (
              <span className="text-xs text-muted-foreground">
                {item.material}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
