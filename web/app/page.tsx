"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFeed, thumbnailUrl } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import { Skeleton } from "@/components/ui/skeleton";
import { OutfitCanvas } from "@/components/outfit-canvas";
import type { FeedItem } from "@/lib/types";

const PAGE_SIZE = 30;

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

export default function FeedPage() {
  const { hydrated } = useUser();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
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

  if (!hydrated) return null;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Feed</h1>
      </div>

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
      ) : (
        <>
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
            {items.map((item) => (
              <div key={`${item.type}-${item.type === "outfit" ? item.outfit?.id : item.item?.id}`} className="break-inside-avoid">
                <FeedCard item={item} />
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {nextCursor && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-8"
            >
              {loadingMore && (
                <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3 w-full">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="break-inside-avoid rounded-xl border border-border bg-card overflow-hidden">
                      <Skeleton className="aspect-[3/4] w-full rounded-none" />
                      <div className="p-2.5 space-y-1.5">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-2.5 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
