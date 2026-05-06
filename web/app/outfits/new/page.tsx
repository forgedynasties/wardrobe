"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { createOutfit, addOutfitItem, getItems, imageUrl } from "@/lib/api";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { randomOutfitName } from "@/lib/outfit-names";
import type { ClothingItem, OutfitItem } from "@/lib/types";

const CATEGORIES = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];

export default function NewOutfitPage() {
  const router = useRouter();
  const [name, setName] = useState(() => randomOutfitName());
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getItems()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItems: OutfitItem[] = items
    .filter((i) => selected.has(i.id))
    .map((i) => ({
      ...i,
      position_x: 0,
      position_y: 0,
      scale: 1,
      z_index: 1,
      rotation: 0,
      thumbnail_url: "",
    }));

  const filtered = filter ? items.filter((i) => i.category === filter) : items;

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const outfit = await createOutfit({ name: name.trim() || randomOutfitName() });
      for (const itemId of selected) {
        await addOutfitItem(outfit.id, itemId);
      }
      router.push(`/outfits/${outfit.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/wardrobe?tab=outfits")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Outfits
        </Button>
        <h1 className="text-xl font-bold">Create Outfit</h1>
        <div className="w-20" />
      </div>

      {/* Name */}
      <div className="flex gap-2 mb-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Outfit name"
          className="text-lg"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setName(randomOutfitName())}
          title="Regenerate name"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Canvas — live preview */}
        <div className="order-1 md:order-2">
          <div className="sticky top-16">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Preview ({selected.size} items)
            </Label>
            <div className="aspect-[3/4] w-full max-w-sm mx-auto bg-muted/30 rounded-xl overflow-hidden">
              {selectedItems.length > 0 ? (
                <OutfitCanvas items={selectedItems} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Select items to preview
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Item picker */}
        <div className="order-2 md:order-1 space-y-4">
          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto">
            {[null, ...CATEGORIES].map((cat) => {
              const count = items.filter((i) => (cat ? i.category === cat : true) && selected.has(i.id)).length;
              return (
                <button
                  key={cat || "all"}
                  onClick={() => setFilter(cat)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === cat
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat || "All"}
                  {count > 0 ? ` · ${count}` : ""}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((item) => {
                const isSelected = selected.has(item.id);
                const src =
                  item.image_status === "done" && item.image_url
                    ? imageUrl(item.image_url)
                    : item.raw_image_url
                      ? imageUrl(item.raw_image_url)
                      : null;

                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className={`relative aspect-square rounded-xl border-2 transition-all overflow-hidden ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30 hover:border-primary/40"
                    }`}
                  >
                    {src ? (
                      <img src={src} alt={item.category} className="w-full h-full object-contain p-1.5" />
                    ) : (
                      <span className="text-2xl">
                        {item.category === "Shoes" ? "👟" : item.category === "Accessory" ? "🎒" : "👕"}
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shadow">
                        ✓
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent px-1 py-0.5">
                      <p className="text-[9px] text-white font-medium truncate text-center leading-tight">
                        {item.sub_category || item.category}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create button — fixed at bottom */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-5xl mx-auto">
        <Button
          className="w-full shadow-lg"
          size="lg"
          onClick={handleSubmit}
          disabled={saving || selected.size === 0}
        >
          {saving ? "Creating..." : `Create Outfit (${selected.size} item${selected.size !== 1 ? "s" : ""})`}
        </Button>
      </div>
    </div>
  );
}
