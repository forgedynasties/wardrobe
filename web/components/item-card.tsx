"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ShimmerImg } from "@/components/shimmer-img";
import type { ClothingItem } from "@/lib/types";
import { thumbnailUrl } from "@/lib/api";

interface ItemCardProps {
  item: ClothingItem;
}

export function ItemCard({ item }: ItemCardProps) {
  const src = item.image_status === "done" || item.raw_image_url
    ? thumbnailUrl(item)
    : null;

  return (
    <Link href={`/items/${item.id}`} className="block h-full">
      <Card className="h-full flex flex-col overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer hover:shadow-md">
        <div className="h-36 sm:h-auto sm:aspect-square bg-card flex items-center justify-center relative overflow-hidden">
          {src ? (
            <ShimmerImg
              src={src}
              alt={`${item.category} ${item.sub_category}`}
              className="object-contain w-full h-full"
              style={{ transform: `scale(${item.display_scale || 1})` }}
            />
          ) : (
            <span className="text-4xl text-muted-foreground/50">
              {item.category === "Shoes" ? "👟" : item.category === "Accessory" ? "🎒" : "👕"}
            </span>
          )}
          {item.colors && item.colors.length > 0 && (
            <div className="absolute top-2 right-2 flex -space-x-1 z-10">
              {item.colors.slice(0, 3).map((c, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
          {!item.last_worn && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary z-10" />
          )}
        </div>
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">
            {item.sub_category || item.category}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {item.sub_category ? item.category : item.material || " "}
          </p>
        </div>
      </Card>
    </Link>
  );
}
