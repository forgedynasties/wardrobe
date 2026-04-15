"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getItems } from "@/lib/api";
import { ItemGrid } from "@/components/item-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClothingItem } from "@/lib/types";

const categories = ["All", "Top", "Bottom", "Outerwear", "Shoes", "Accessory"];

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Wardrobe</h1>
        <Link href="/items/new">
          <Button size="sm">+ Add</Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={filter === cat ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => setFilter(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="text-muted-foreground animate-pulse">
            Loading...
          </span>
        </div>
      ) : (
        <ItemGrid items={filtered} />
      )}
    </div>
  );
}
