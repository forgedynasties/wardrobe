"use client";

import { memo } from "react";
import { Shirt } from "lucide-react";
import { ItemCard } from "./item-card";
import { AddItemButton } from "./add-item-button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClothingItem } from "@/lib/types";

interface ItemGridProps {
  items: ClothingItem[];
  loading?: boolean;
}

export const ItemGrid = memo(function ItemGrid({ items, loading }: ItemGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Shirt className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium text-foreground mb-1">Your hangur is empty</p>
        <p className="text-sm mb-6">Add your first clothing item to get started</p>
        <AddItemButton />
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
});
