"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPublicOutfit, thumbnailUrl } from "@/lib/api";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { OutfitExportButton } from "@/components/outfit-export-button";
import { ShimmerImg } from "@/components/shimmer-img";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import type { Outfit } from "@/lib/types";

export default function PublicOutfitPage() {
  const { username, id } = useParams<{ username: string; id: string }>();
  const [outfit, setOutfit] = useState<Outfit | null | "not-found">(null);

  useEffect(() => {
    getPublicOutfit(username, id).then(setOutfit).catch(() => setOutfit("not-found"));
  }, [username, id]);

  if (outfit === null) {
    return (
      <div className="p-4 max-w-sm mx-auto space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      </div>
    );
  }

  if (outfit === "not-found") {
    return (
      <div className="p-4 max-w-sm mx-auto flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">Outfit not found</p>
        <p className="text-sm text-muted-foreground mt-1">This link may be invalid or the outfit was removed.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-sm mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{outfit.name}</h1>
        <OutfitExportButton items={outfit.items ?? []} name={outfit.name} />
      </div>

      {outfit.items && outfit.items.length > 0 && (
        <div className="aspect-[3/4] w-full bg-muted/30 rounded-xl overflow-hidden relative">
          <OutfitCanvas items={outfit.items} />
        </div>
      )}

      {outfit.items && outfit.items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{outfit.items.length} items</p>
          <div className="grid grid-cols-4 gap-2">
            {outfit.items.map((item) => {
              const src = thumbnailUrl(item) || null;
              return (
                <Link
                  key={item.id}
                  href={`/p/${username}/items/${item.id}`}
                  className="aspect-square bg-card rounded-lg overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  {src
                    ? <ShimmerImg src={src} alt={item.category} className="w-full h-full object-contain p-1" />
                    : <span className="text-xl">{item.category === "Shoes" ? "👟" : "👕"}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-4 border-t">
        From{" "}
        <Link href={`/p/${username}`} className="underline underline-offset-2">
          @{username}
        </Link>
        &apos;s hangur
      </p>
    </div>
  );
}
