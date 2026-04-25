"use client";

import { useSyncExternalStore } from "react";
import { thumbnailUrl } from "@/lib/api";
import { outfitConfig } from "@/lib/outfit-config";
import type { ClothingItem, OutfitItem } from "@/lib/types";

interface Props {
  items: Array<OutfitItem | ClothingItem>;
  className?: string;
}

function isOutfitItem(i: ClothingItem | OutfitItem): i is OutfitItem {
  return "position_x" in i;
}

function hasCustomLayout(items: Array<OutfitItem | ClothingItem>): boolean {
  return items.some((i) => {
    if (!isOutfitItem(i)) return false;
    return i.position_x !== 0 || i.position_y !== 0;
  });
}

function itemSrc(item: ClothingItem): string | null {
  const url = thumbnailUrl(item);
  return url || null;
}

function useOutfitConfig() {
  return useSyncExternalStore(
    outfitConfig.subscribe,
    outfitConfig.get,
    outfitConfig.getServerSnapshot,
  );
}

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
                transform: `translate(${layout.position_x}%, ${layout.position_y}%) scale(${item.display_scale || 1})`,
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
          const subSlot = item.sub_category ? cfg.subcategorySlots[item.sub_category] : undefined;
          const slot = subSlot ?? cfg.mannequinSlots[item.category] ?? defaultSlot;
          const hasCustomX = slot.left !== undefined;
          const slotWidth = slot.width ?? 80;
          return (
            <div
              key={item.id ?? idx}
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                top: `${slot.top}%`,
                left: hasCustomX ? `${slot.left}%` : "50%",
                height: `${slot.height}%`,
                width: `${slotWidth}%`,
                zIndex: slot.zIndex,
                transform: `${hasCustomX ? "" : "translateX(-50%) "}scale(${item.display_scale || 1})`,
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
