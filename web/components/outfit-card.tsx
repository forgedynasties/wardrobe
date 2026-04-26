"use client";

import { memo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { OutfitExportButton } from "@/components/outfit-export-button";
import { Pin, EyeOff, Eye } from "lucide-react";
import type { Outfit } from "@/lib/types";

interface OutfitCardProps {
  outfit: Outfit;
  href?: string;
  onToggleHidden?: () => void;
  onTogglePinned?: () => void;
}

export const OutfitCard = memo(function OutfitCard({ outfit, href, onToggleHidden, onTogglePinned }: OutfitCardProps) {
  const outfitHref = href ?? `/outfits/${outfit.id}`;
  return (
    <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all duration-200 hover:shadow-md">
      <Link href={outfitHref}>
        <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden cursor-pointer">
          <OutfitCanvas items={outfit.items ?? []} />
          <OutfitExportButton
            items={outfit.items ?? []}
            name={outfit.name}
            variant="overlay"
          />
          {outfit.pinned && (
            <div className="absolute top-1.5 left-1.5 bg-black/60 rounded p-0.5">
              <Pin className="h-3 w-3 text-white fill-white" />
            </div>
          )}
        </div>
      </Link>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <Link href={outfitHref} className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{outfit.name}</h3>
          </Link>
          {(onToggleHidden || onTogglePinned) && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onTogglePinned && (
                <button
                  onClick={onTogglePinned}
                  className={`p-1 rounded hover:bg-muted transition-colors ${outfit.pinned ? "text-foreground" : "text-muted-foreground"}`}
                  title={outfit.pinned ? "Unpin" : "Pin"}
                >
                  <Pin className={`h-3.5 w-3.5 ${outfit.pinned ? "fill-current" : ""}`} />
                </button>
              )}
              {onToggleHidden && (
                <button
                  onClick={onToggleHidden}
                  className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
                  title={outfit.hidden ? "Show in gallery" : "Hide from gallery"}
                >
                  {outfit.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {outfit.items?.length || 0} items &middot; {outfit.usage_count} wear
          {outfit.usage_count !== 1 ? "s" : ""}
        </div>
      </div>
    </Card>
  );
});
