"use client";

import { imageUrl } from "@/lib/api";
import type { ClothingItem, OutfitItem } from "@/lib/types";

interface Props {
  items: Array<OutfitItem | ClothingItem>;
  className?: string;
}

const categoryOrder = ["Outerwear", "Top", "Bottom", "Shoes", "Accessory"];
const categoryWeight: Record<string, number> = {
  Outerwear: 1.3,
  Top: 1.1,
  Bottom: 1.1,
  Shoes: 0.7,
  Accessory: 0.5,
};

function isOutfitItem(i: ClothingItem | OutfitItem): i is OutfitItem {
  return "position_x" in i;
}

export function hasCustomLayout(items: Array<OutfitItem | ClothingItem>): boolean {
  return items.some((i) => {
    if (!isOutfitItem(i)) return false;
    return i.position_x !== 0 || i.position_y !== 0 || i.scale !== 1;
  });
}

function itemSrc(item: ClothingItem): string | null {
  if (item.image_status === "done" && item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return null;
}

export function OutfitCanvas({ items, className }: Props) {
  const useCustom = hasCustomLayout(items);

  if (useCustom) {
    const sorted = [...items].sort((a, b) => {
      const az = isOutfitItem(a) ? a.z_index : 0;
      const bz = isOutfitItem(b) ? b.z_index : 0;
      return az - bz;
    });
    return (
      <div className={`absolute inset-0 isolate ${className ?? ""}`}>
        {sorted.map((item, idx) => {
          const src = itemSrc(item);
          const layout = isOutfitItem(item)
            ? item
            : { position_x: 0, position_y: 0, scale: 1, z_index: 0 };
          return (
            <div
              key={item.id ?? idx}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${layout.position_x}%, ${layout.position_y}%) scale(${layout.scale})`,
                zIndex: layout.z_index,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.category}
                  className="max-w-[60%] max-h-[60%] object-contain"
                />
              ) : (
                <span className="text-xl text-muted-foreground/50">👕</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const sorted = [...items].sort(
    (a, b) => categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category),
  );
  const overlap = items.length > 2 ? -12 : -6;

  return (
    <div
      className={`flex flex-col items-center justify-center w-full h-full py-2 ${className ?? ""}`}
    >
      {sorted.length === 0 ? (
        <span className="text-3xl text-muted-foreground/30">✨</span>
      ) : (
        sorted.map((item, idx) => {
          const src = itemSrc(item);
          const weight = categoryWeight[item.category] ?? 1;
          return (
            <div
              key={item.id ?? idx}
              className="w-3/4 flex items-center justify-center min-h-0"
              style={{
                flex: `${weight} 1 0%`,
                marginTop: idx > 0 ? `${overlap}%` : 0,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.category}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <span className="text-xl text-muted-foreground/50">👕</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
