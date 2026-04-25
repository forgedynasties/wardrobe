"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicItem, imageUrl } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import Link from "next/link";
import type { ClothingItem } from "@/lib/types";

export default function PublicItemPage() {
  const { username, id } = useParams<{ username: string; id: string }>();
  const [item, setItem] = useState<ClothingItem | null | "not-found">(null);

  useEffect(() => {
    getPublicItem(username, id).then(setItem).catch(() => setItem("not-found"));
  }, [username, id]);

  if (item === null) {
    return (
      <div className="p-4 max-w-sm mx-auto space-y-4">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    );
  }

  if (item === "not-found") {
    return (
      <div className="p-4 max-w-sm mx-auto flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">Item not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link may be invalid or the item was removed.</p>
      </div>
    );
  }

  const src = item.image_url
    ? imageUrl(item.image_url)
    : item.raw_image_url
    ? imageUrl(item.raw_image_url)
    : null;

  return (
    <div className="p-4 max-w-sm mx-auto space-y-4">
      <div className="aspect-square bg-card rounded-xl flex items-center justify-center overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={item.category}
            className="w-full h-full object-contain"
            style={{ transform: `scale(${item.display_scale || 1})` }}
          />
        ) : (
          <span className="text-6xl">👕</span>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xl font-bold capitalize">{item.sub_category || item.category}</p>
        <p className="text-sm text-muted-foreground capitalize">{item.category}</p>

        {item.colors && item.colors.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {item.colors.map((c, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: c }} />
                <span className="text-sm font-mono text-muted-foreground">{c}</span>
              </div>
            ))}
          </div>
        )}
        {item.material && <p className="text-sm text-muted-foreground">{item.material}</p>}
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t">
        From{" "}
        <Link href={`/p/${username}`} className="underline underline-offset-2">
          @{username}
        </Link>
        's wardrobe
      </p>
    </div>
  );
}
