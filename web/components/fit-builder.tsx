"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getItems, imageUrl } from "@/lib/api";
import type { ClothingItem } from "@/lib/types";

interface FitBuilderProps {
  onSelect: (itemIds: string[]) => void;
  initialItems?: ClothingItem[];
}

const categories = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];

export function FitBuilder({ onSelect, initialItems }: FitBuilderProps) {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialItems?.map(i => i.id) || [])
  );
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter
    ? items.filter((i) => i.category === filter)
    : items;

  const handleToggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const handleApply = () => {
    onSelect(Array.from(selected));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <span className="text-muted-foreground animate-pulse">
          Loading items...
        </span>
      </div>
    );
  }

  if (error !== null || (!loading && items.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
        <span className="text-4xl mb-4">{error ? "⚠️" : "👕"}</span>
        <p className="text-muted-foreground font-medium">
          {error
            ? error.includes("authenticated") ? "Session Expired" : "Connection Error"
            : "Your hangur is empty"}
        </p>
        <p className="text-sm text-muted-foreground mt-1 text-center px-4">
          {error
            ? error.includes("authenticated") ? "Log out and log back in to continue." : "The backend might not be reachable. Check the console for details."
            : "Start by uploading some clothes to your hangur!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-0 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-2 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Selected:</span>
          <span className="text-lg font-bold text-primary">{selected.size}</span>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[null, ...categories].map((cat) => (
            <Button
              key={cat || "all"}
              variant={filter === cat ? "default" : "outline"}
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setFilter(cat)}
            >
              {cat || "All"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((item) => {
          const isSelected = selected.has(item.id);
          const src =
            item.image_status === "done" && item.image_url
              ? imageUrl(item.image_url)
              : item.raw_image_url
                ? imageUrl(item.raw_image_url)
                : null;

          return (
            <div
              key={item.id}
              className={`cursor-pointer transition-all ${
                isSelected ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => handleToggle(item.id)}
            >
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-card flex items-center justify-center relative">
                  {src ? (
                    <img
                      src={src}
                      alt={item.category}
                      className="object-contain w-full h-full p-2"
                    />
                  ) : (
                    <span className="text-3xl">👕</span>
                  )}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl">✓</span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <Badge variant="secondary" className="text-xs">
                    {item.category}
                  </Badge>
                  {item.sub_category && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.sub_category}
                    </p>
                  )}
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {selected.size > 0 && (
        <Button className="w-full" onClick={handleApply}>
          Apply {selected.size} item{selected.size !== 1 ? "s" : ""}
        </Button>
      )}
    </div>
  );
}
