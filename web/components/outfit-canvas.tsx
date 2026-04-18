"use client";

import { useSyncExternalStore } from "react";
import { imageUrl } from "@/lib/api";
import { outfitConfig } from "@/lib/outfit-config";
import type { ClothingItem, OutfitItem } from "@/lib/types";

interface Props {
  items: Array<OutfitItem | ClothingItem>;
  className?: string;
}

function isOutfitItem(i: ClothingItem | OutfitItem): i is OutfitItem {
  return "position_x" in i;
}

export function hasCustomLayout(items: Array<OutfitItem | ClothingItem>): boolean {
  return items.some((i) => {
    if (!isOutfitItem(i)) return false;
    return i.position_x !== 0 || i.position_y !== 0;
  });
}

function itemSrc(item: ClothingItem): string | null {
  if (item.image_status === "done" && item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return null;
}

function useOutfitConfig() {
  return useSyncExternalStore(
    outfitConfig.subscribe,
    outfitConfig.get,
    outfitConfig.getServerSnapshot,
  );
}

// Mannequin slots: vertical region each category occupies on the "body"
// top = % from top of container, height = % of container height
const mannequinSlots: Record<string, { top: number; height: number; zIndex: number }> = {
  Outerwear: { top: 0, height: 50, zIndex: 3 },
  Top:       { top: 2, height: 45, zIndex: 2 },
  Bottom:    { top: 38, height: 42, zIndex: 1 },
  Shoes:     { top: 76, height: 24, zIndex: 4 },
  Accessory: { top: 0, height: 20, zIndex: 5 },
};

const defaultSlot = { top: 20, height: 40, zIndex: 1 };

export function OutfitCanvas({ items, className }: Props) {
  const cfg = useOutfitConfig();
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
            : { position_x: 0, position_y: 0, z_index: 0 };
          return (
            <div
              key={item.id ?? idx}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `translate(${layout.position_x}%, ${layout.position_y}%)`,
                zIndex: layout.z_index,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.category}
                  className="w-full h-full object-contain"
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

  // Mannequin composition: position each item in its body-region slot
  const sorted = [...items].sort(
    (a, b) => cfg.categoryOrder.indexOf(a.category) - cfg.categoryOrder.indexOf(b.category),
  );

  return (
    <div
      className={`relative w-full h-full ${className ?? ""}`}
    >
      {sorted.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl text-muted-foreground/30">✨</span>
        </div>
      ) : (
        sorted.map((item, idx) => {
          const src = itemSrc(item);
          const slot = mannequinSlots[item.category] ?? defaultSlot;
          return (
            <div
              key={item.id ?? idx}
              className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none"
              style={{
                top: `${slot.top}%`,
                height: `${slot.height}%`,
                width: "80%",
                zIndex: slot.zIndex,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.category}
                  className="w-full h-full object-contain"
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
