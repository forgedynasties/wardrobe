"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFeed, thumbnailUrl } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { OutfitCanvas } from "@/components/outfit-canvas";
import type { FeedItem } from "@/lib/types";

const PAGE_SIZE = 30;
const CATEGORIES = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];

type FilterMode = "outfits" | "items" | "all";

function FeedCard({ item }: { item: FeedItem }) {
  const router = useRouter();
  const isOutfit = item.type === "outfit";

  const href = isOutfit
    ? `/p/${item.owner}/outfits/${item.outfit?.id}`
    : `/p/${item.owner}/items/${item.item?.id}`;

  const goToProfile = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    e.preventDefault();
    router.push(`/p/${item.owner}`);
  };

  return (
    <Link
      href={href}
      className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-colors"
    >
      {isOutfit ? (
        <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
          <OutfitCanvas items={item.outfit?.items ?? []} />
          {(item.outfit?.items?.length ?? 0) > 1 && (
            <span className="absolute top-2 left-2 bg-background/80 backdrop-blur rounded-full px-2 py-0.5 text-[10px] font-medium">
              {item.outfit!.items!.length} items
            </span>
          )}
        </div>
      ) : (
        <div className="bg-muted/30 relative overflow-hidden">
          {(() => {
            const imgUrl = thumbnailUrl(item.item ?? {});
            return imgUrl ? (
              <img
                src={imgUrl}
                alt=""
                className="w-full h-auto group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-[3/4] flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            );
          })()}
        </div>
      )}
      <div className="p-2.5 space-y-1">
        <p className="text-xs font-medium truncate">
          {isOutfit ? item.outfit?.name : (item.item?.name || item.item?.category)}
        </p>
        <span
          onClick={goToProfile}
          onKeyDown={(e) => e.key === "Enter" && goToProfile(e)}
          role="link"
          tabIndex={0}
          className="text-[11px] text-muted-foreground hover:text-foreground truncate block cursor-pointer"
        >
          {item.display_name}
        </span>
      </div>
    </Link>
  );
}

function FeedSkeleton() {
  return (
    <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="break-inside-avoid rounded-xl border border-border bg-card overflow-hidden">
          <Skeleton className="aspect-[3/4] w-full rounded-none" />
          <div className="p-2.5 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MasonryGrid({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
      {items.map((item) => (
        <div key={`${item.type}-${item.type === "outfit" ? item.outfit?.id : item.item?.id}`} className="break-inside-avoid">
          <FeedCard item={item} />
        </div>
      ))}
    </div>
  );
}

export default function FeedPage() {
  const { hydrated } = useUser();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("outfits");
  const [itemCategory, setItemCategory] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async (cursor?: string) => {
    setError(null);
    try {
      const page = await getFeed(PAGE_SIZE, cursor);
      if (cursor) {
        setItems((prev) => [...prev, ...page.data]);
      } else {
        setItems(page.data);
      }
      setNextCursor(page.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [hydrated, load]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!nextCursor || loadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          load(nextCursor).finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: "400px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nextCursor, loadingMore, load]);

  const filteredItems = useMemo(() => {
    if (filter === "outfits") return items.filter((i) => i.type === "outfit");
    if (filter === "items") {
      const itemEntries = items.filter((i) => i.type === "item");
      if (!itemCategory) return itemEntries;
      return itemEntries.filter((i) => (i.item?.category || "Other") === itemCategory);
    }
    return items;
  }, [items, filter, itemCategory]);

  const allGroups = useMemo(() => {
    if (filter !== "all") return null;
    const itemEntries = items.filter((i) => i.type === "item");
    const outfitEntries = items.filter((i) => i.type === "outfit");
    const byCategory: Record<string, FeedItem[]> = {};
    for (const item of itemEntries) {
      const cat = item.item?.category || "Other";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(item);
    }
    return { byCategory, outfits: outfitEntries };
  }, [items, filter]);

  if (!hydrated) return null;

  const FILTERS: { key: FilterMode; label: string }[] = [
    { key: "outfits", label: "Outfits" },
    { key: "items", label: "Items" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Feed</h1>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setItemCategory(null); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Category sub-pills — only when Items is selected */}
      {filter === "items" && (
        <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
          {(["All", ...CATEGORIES] as const).map((cat) => {
            const active = cat === "All" ? itemCategory === null : itemCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setItemCategory(cat === "All" ? null : cat)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mb-4">{error}</p>
      )}

      {loading ? (
        <FeedSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-lg font-medium text-foreground mb-1">Nothing to see yet</p>
          <p className="text-sm">Be the first to add something</p>
        </div>
      ) : filter === "all" && allGroups ? (
        <div className="space-y-8">
          {allGroups.outfits.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Outfits</h2>
              <MasonryGrid items={allGroups.outfits} />
            </div>
          )}
          {CATEGORIES.map((cat) => {
            const catItems = allGroups.byCategory[cat];
            if (!catItems || catItems.length === 0) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{cat}</h2>
                <MasonryGrid items={catItems} />
              </div>
            );
          })}
          {(() => {
            const otherItems = allGroups.byCategory["Other"];
            if (!otherItems || otherItems.length === 0) return null;
            return (
              <div>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Other</h2>
                <MasonryGrid items={otherItems} />
              </div>
            );
          })()}
        </div>
      ) : (
        <MasonryGrid items={filteredItems} />
      )}

      {/* Infinite scroll sentinel */}
      {nextCursor && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-8"
        >
          {loadingMore && <FeedSkeleton />}
        </div>
      )}
    </div>
  );
}
