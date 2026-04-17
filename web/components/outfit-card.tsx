"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { OutfitCanvas } from "@/components/outfit-canvas";
import type { Outfit } from "@/lib/types";

interface OutfitCardProps {
  outfit: Outfit;
}

export function OutfitCard({ outfit }: OutfitCardProps) {
  return (
    <Link href={`/outfits/${outfit.id}`}>
      <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer hover:shadow-md">
        <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
          <OutfitCanvas items={outfit.items ?? []} />
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          <h3 className="font-semibold text-sm truncate">{outfit.name}</h3>
          <div className="text-xs text-muted-foreground">
            {outfit.items?.length || 0} items &middot; {outfit.usage_count} wear
            {outfit.usage_count !== 1 ? "s" : ""}
          </div>
        </div>
      </Card>
    </Link>
  );
}
