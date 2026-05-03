"use client";

import Link from "next/link";
import { TrendingUp, Ghost, Flame, BarChart3 } from "lucide-react";
import type { Outfit } from "@/lib/types";

interface OutfitStatsProps {
  outfits: Outfit[];
}

function relativeTime(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return "over a year ago";
}

export function OutfitStats({ outfits }: OutfitStatsProps) {
  const totalWears = outfits.reduce((sum, o) => sum + o.usage_count, 0);
  const avgWears = outfits.length > 0 ? (totalWears / outfits.length).toFixed(1) : "0";
  const neverWorn = outfits.filter(o => !o.last_worn);
  const mostWorn = outfits.length > 0 ? outfits.reduce((max, o) => o.usage_count > max.usage_count ? o : max) : null;
  const dustiest = outfits
    .filter(o => o.last_worn)
    .sort((a, b) => new Date(a.last_worn!).getTime() - new Date(b.last_worn!).getTime())[0] ?? null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* total */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-3xl font-bold tracking-tight">{outfits.length}</p>
        <p className="text-xs font-medium mt-1">outfits</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {outfits.length === 1 ? "just getting started" : outfits.length < 5 ? "building the collection" : outfits.length < 15 ? "solid wardrobe" : "proper closet"}
        </p>
      </div>

      {/* total wears */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-3xl font-bold tracking-tight">{totalWears}</p>
        <p className="text-xs font-medium mt-1">total wears</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          ~{avgWears} per outfit
        </p>
      </div>

      {/* most worn */}
      {mostWorn && mostWorn.usage_count > 0 ? (
        <Link href={`/outfits/${mostWorn.id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors col-span-1">
          <div className="flex items-center gap-1 mb-1">
            <Flame className="h-3 w-3 text-orange-400" />
            <p className="text-[11px] text-muted-foreground font-medium">most worn</p>
          </div>
          <p className="text-sm font-semibold truncate leading-snug">{mostWorn.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{mostWorn.usage_count} wears</p>
        </Link>
      ) : (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-1 mb-1">
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground font-medium">most worn</p>
          </div>
          <p className="text-sm text-muted-foreground">nothing yet</p>
        </div>
      )}

      {/* dustiest / never worn */}
      {neverWorn.length > 0 ? (
        <Link href={`/outfits/${neverWorn[0].id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors col-span-1">
          <div className="flex items-center gap-1 mb-1">
            <Ghost className="h-3 w-3 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground font-medium">never worn</p>
          </div>
          <p className="text-sm font-semibold truncate leading-snug">{neverWorn[0].name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {neverWorn.length > 1 ? `+${neverWorn.length - 1} more` : "give it a shot"}
          </p>
        </Link>
      ) : dustiest ? (
        <Link href={`/outfits/${dustiest.id}`} className="rounded-xl border bg-card p-4 hover:bg-muted/40 transition-colors col-span-1">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground rotate-180" />
            <p className="text-[11px] text-muted-foreground font-medium">collecting dust</p>
          </div>
          <p className="text-sm font-semibold truncate leading-snug">{dustiest.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">last worn {relativeTime(dustiest.last_worn!)}</p>
        </Link>
      ) : null}
    </div>
  );
}
