"use client";

import { OutfitCanvas } from "@/components/outfit-canvas";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OutfitItem } from "@/lib/types";

const MOCK_ITEMS: OutfitItem[] = [
  {
    id: "1", category: "Outerwear", sub_category: "Jacket", name: "Denim Jacket",
    colors: ["#4a6fa5"], material: "Denim", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 3, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "2", category: "Top", sub_category: "T-Shirt", name: "White Tee",
    colors: ["#ffffff"], material: "Cotton", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 2, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "3", category: "Bottom", sub_category: "Jeans", name: "Slim Jeans",
    colors: ["#2c3e50"], material: "Denim", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 1, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "4", category: "Shoes", sub_category: "Sneakers", name: "White Sneakers",
    colors: ["#ffffff", "#e0e0e0"], material: "Leather", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 4, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

const MOCK_ITEMS_2: OutfitItem[] = [
  {
    id: "5", category: "Top", sub_category: "Sweater", name: "Knit Sweater",
    colors: ["#8b6b4a"], material: "Wool", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 2, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "6", category: "Bottom", sub_category: "Trousers", name: "Wide Trousers",
    colors: ["#3d3d3d"], material: "Cotton", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 1, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
  {
    id: "7", category: "Shoes", sub_category: "Loafers", name: "Black Loafers",
    colors: ["#1a1a1a"], material: "Leather", image_url: "", raw_image_url: "",
    image_status: "done", display_scale: 1, last_worn: "",
    position_x: 0, position_y: 0, scale: 1, z_index: 4, rotation: 0, thumbnail_url: "",
    brand: "", product_url: "",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  },
];

export default function LayoutTestPage() {
  return (
    <div className="p-4 max-w-6xl mx-auto space-y-12 pb-24">
      <div>
        <h1 className="text-2xl font-bold mb-1">Layout Test</h1>
        <p className="text-sm text-muted-foreground">Compare canvas sizes before deciding.</p>
      </div>

      {/* ── Option A: Hero canvas (enlarged detail view) ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">
          A — Hero Canvas <span className="text-xs font-normal normal-case">(outfit detail page)</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Full-width canvas, name below, actions inline. Canvas is the focal point.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hero version */}
          <Card className="p-4 space-y-4">
            <div className="aspect-[3/4] w-full max-w-sm mx-auto bg-muted/30 rounded-lg overflow-hidden">
              <OutfitCanvas items={MOCK_ITEMS} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Weekend Fit</h3>
              <p className="text-sm text-muted-foreground">12 wears · last worn May 3</p>
            </div>
            <Button className="w-full gap-2" size="lg">Wear Today</Button>
            <div className="grid grid-cols-4 gap-2">
              {MOCK_ITEMS.map((item) => (
                <div key={item.id} className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                  {item.sub_category}
                </div>
              ))}
            </div>
          </Card>

          {/* Hero version - larger */}
          <Card className="p-4 space-y-4 flex flex-col items-center">
            <div className="aspect-[3/4] w-full max-w-xs bg-muted/30 rounded-lg overflow-hidden">
              <OutfitCanvas items={MOCK_ITEMS_2} />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold">Office Casual</h3>
              <p className="text-sm text-muted-foreground">5 wears · last worn Apr 28</p>
            </div>
            <Button className="w-full gap-2" size="lg">Wear Today</Button>
            <div className="grid grid-cols-3 gap-2 w-full">
              {MOCK_ITEMS_2.map((item) => (
                <div key={item.id} className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                  {item.sub_category}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ── Option B: Larger canvas on cards ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">
          B — Prominent Card Canvas <span className="text-xs font-normal normal-case">(grid cards)</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Canvas takes up most of the card. Metadata minimal. Image-first browsing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { name: "Weekend Fit", wears: 12, items: MOCK_ITEMS },
            { name: "Office Casual", wears: 5, items: MOCK_ITEMS_2 },
            { name: "Gym Kit", wears: 8, items: [MOCK_ITEMS[1], MOCK_ITEMS[2], MOCK_ITEMS[3]] },
          ].map((outfit) => (
            <Card key={outfit.name} className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all group">
              <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
                <OutfitCanvas items={outfit.items} />
                <div className="absolute top-2 left-2 bg-background/80 backdrop-blur rounded-full px-2 py-0.5 text-[10px] font-medium">
                  {outfit.items.length} items
                </div>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">{outfit.name}</h3>
                  <p className="text-xs text-muted-foreground">{outfit.wears} wears</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Current: compact cards (baseline) ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-muted-foreground">
          Current <span className="text-xs font-normal normal-case">(baseline for comparison)</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { name: "Weekend Fit", wears: 12, items: MOCK_ITEMS },
            { name: "Office Casual", wears: 5, items: MOCK_ITEMS_2 },
            { name: "Gym Kit", wears: 8, items: [MOCK_ITEMS[1], MOCK_ITEMS[2], MOCK_ITEMS[3]] },
            { name: "Date Night", wears: 2, items: [MOCK_ITEMS[0], MOCK_ITEMS[2], MOCK_ITEMS[3]] },
          ].map((outfit) => (
            <Card key={outfit.name} className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
              <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
                <OutfitCanvas items={outfit.items} />
              </div>
              <div className="px-3 py-2">
                <h3 className="font-semibold text-sm truncate">{outfit.name}</h3>
                <p className="text-xs text-muted-foreground">{outfit.items.length} items · {outfit.wears} wears</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
