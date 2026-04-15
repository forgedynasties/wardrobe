"use client";

import { ItemCard } from "./item-card";
import type { ClothingItem } from "@/lib/types";

interface ItemGridProps {
  items: ClothingItem[];
}

export function ItemGrid({ items }: ItemGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <span className="text-5xl mb-4">🏠</span>
        <p className="text-lg">Your wardrobe is empty</p>
        <p className="text-sm">Add your first item to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
