"use client";

import Link from "next/link";
import { ChevronRight, Shirt, ArrowDown, Wind, Footprints, Watch } from "lucide-react";
import { ShimmerImg } from "@/components/shimmer-img";
import { thumbnailUrl } from "@/lib/api";
import { CategoryPixelBox } from "@/components/category-pixel-box";
import type { ClothingItem } from "@/lib/types";

function colorsFromItems(items: ClothingItem[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const item of items) {
    for (const c of item.colors ?? []) {
      if (!seen.has(c)) { seen.add(c); colors.push(c); }
    }
  }
  return colors;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Top: Shirt,
  Bottom: ArrowDown,
  Outerwear: Wind,
  Shoes: Footprints,
  Accessory: Watch,
};

interface CategoryStripProps {
  category: string;
  items: ClothingItem[];
  onSeeAll: () => void;
}

function StripCard({ item }: { item: ClothingItem }) {
  const src = item.image_status === "done" || item.raw_image_url
    ? thumbnailUrl(item)
    : null;

  return (
    <Link
      href={`/items/${item.id}`}
      className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-card border border-border overflow-hidden flex items-center justify-center relative group hover:ring-2 hover:ring-primary/40 transition-all"
    >
      {src ? (
        <ShimmerImg
          src={src}
          alt={item.sub_category || item.category}
          className="w-full h-full object-contain"
          style={{ transform: `scale(${item.display_scale || 1})` }}
        />
      ) : (
        <span className="text-3xl text-muted-foreground/40">
          {item.category === "Shoes" ? "👟" : item.category === "Accessory" ? "🎒" : "👕"}
        </span>
      )}
      {item.colors && item.colors.length > 0 && (
        <div className="absolute bottom-1 left-1 flex gap-0.5">
          {item.colors.slice(0, 3).map((c, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full border border-background/80"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
      {!item.last_worn && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
      )}
    </Link>
  );
}

export function CategoryStrip({ category, items, onSeeAll }: CategoryStripProps) {
  if (items.length === 0) return null;
  const Icon = CATEGORY_ICONS[category];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CategoryPixelBox colors={colorsFromItems(items)} />
          <div>
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              <h2 className="font-semibold text-base">{category}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          See all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-0.5 -mx-0.5 snap-x snap-mandatory scrollbar-none">
        {items.map((item) => (
          <div key={item.id} className="snap-start">
            <StripCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
