"use client";

import { useEffect, useState, useCallback } from "react";
import { getItemsPage } from "@/lib/api";
import { ItemGrid } from "@/components/item-grid";
import { AddItemButton } from "@/components/add-item-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/user-context";
import type { ClothingItem } from "@/lib/types";

const categories = ["All", "Top", "Bottom", "Outerwear", "Shoes", "Accessory"];
const PAGE_SIZE = 24;

export default function WardrobePage() {
  const { user, hydrated } = useUser();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

  useEffect(() => {
    if (!hydrated || !user) return;
    setLoading(true);
    setItems([]);
    setNextCursor(undefined);
    getItemsPage(PAGE_SIZE)
      .then((page) => {
        setItems(page.data);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoading(false));
  }, [hydrated, user]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await getItemsPage(PAGE_SIZE, nextCursor);
      setItems((prev) => [...prev, ...page.data]);
      setNextCursor(page.next_cursor);
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  const filtered =
    filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Wardrobe</h1>
        <AddItemButton />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={filter === cat ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap select-none"
            onClick={() => setFilter(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      <ItemGrid items={filtered} loading={loading} />

      {!loading && nextCursor && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="fixed bottom-20 right-4 z-40 md:hidden">
          <AddItemButton variant="fab" />
        </div>
      )}
    </div>
  );
}
