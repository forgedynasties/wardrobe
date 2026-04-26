"use client";

import Link from "next/link";
import { ChevronRight, Shirt, ArrowDown, Wind, Footprints, Watch } from "lucide-react";
import { ShimmerImg } from "@/components/shimmer-img";
import { thumbnailUrl } from "@/lib/api";
import type { ClothingItem } from "@/lib/types";

function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0)
          : max === g ? (b - r) / d + 2
          : (r - g) / d + 4;
  return h * 60;
}

function CategorySpectrum({ items }: { items: ClothingItem[] }) {
  const colors: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const c of item.colors ?? []) {
      if (!seen.has(c)) { seen.add(c); colors.push(c); }
    }
  }
  if (colors.length === 0) return null;
  const sorted = [...colors].sort((a, b) => hexToHue(a) - hexToHue(b));
  return (
    <div className="flex h-2 rounded-full overflow-hidden mb-2">
      {sorted.map((c) => (
        <div key={c} className="flex-1 h-full" style={{ backgroundColor: c }} />
      ))}
    </div>
  );
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
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h2 className="font-semibold text-base">{category}</h2>
          <span className="text-xs text-muted-foreground">{items.length}</span>
        </div>
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          See all
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      <CategorySpectrum items={items} />

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
