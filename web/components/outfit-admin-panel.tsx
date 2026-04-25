"use client";

import { useSyncExternalStore, useState } from "react";
import { Settings2, RotateCcw, X } from "lucide-react";
import { outfitConfig } from "@/lib/outfit-config";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const ALL_CATEGORIES = ["Outerwear", "Top", "Bottom", "Shoes", "Accessory"];
const ALL_SUBCATEGORIES = ["Crop Top"];

function useCfg() {
  return useSyncExternalStore(
    outfitConfig.subscribe,
    outfitConfig.get,
    outfitConfig.getServerSnapshot,
  );
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}

function SliderRow({ label, value, min, max, step, onChange, suffix }: SliderRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

export function OutfitAdminPanel() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const cfg = useCfg();

  if (!user?.is_admin) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 left-4 z-40 h-10 w-10 rounded-full bg-card border shadow-lg flex items-center justify-center hover:bg-muted transition"
        title="Outfit layout admin"
        aria-label="Outfit layout admin"
      >
        <Settings2 className="h-4 w-4" />
      </button>

      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 h-full w-[340px] sm:w-[380px] bg-popover text-popover-foreground border-l shadow-2xl overflow-y-auto transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-popover z-10">
          <h2 className="font-heading text-base font-medium">Layout Admin</h2>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => outfitConfig.reset()}
              className="gap-1 h-7 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-4 pb-8 space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Spacing
            </h3>
            <SliderRow
              label="Overlap (small)"
              value={cfg.overlapSmall}
              min={-40}
              max={20}
              step={1}
              suffix="%"
              onChange={(v) => outfitConfig.set({ overlapSmall: v })}
            />
            <SliderRow
              label="Overlap (large)"
              value={cfg.overlapLarge}
              min={-40}
              max={20}
              step={1}
              suffix="%"
              onChange={(v) => outfitConfig.set({ overlapLarge: v })}
            />
            <SliderRow
              label="Overlap threshold"
              value={cfg.overlapThreshold}
              min={1}
              max={6}
              step={1}
              onChange={(v) => outfitConfig.set({ overlapThreshold: v })}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Per-category z-index
            </h3>
            {ALL_CATEGORIES.map((cat) => (
              <SliderRow
                key={cat}
                label={cat}
                value={cfg.categoryZIndex[cat] ?? 0}
                min={0}
                max={10}
                step={1}
                onChange={(v) =>
                  outfitConfig.set({
                    categoryZIndex: { ...cfg.categoryZIndex, [cat]: v },
                  })
                }
              />
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Mannequin slots
            </h3>
            {ALL_CATEGORIES.map((cat) => {
              const slot = cfg.mannequinSlots?.[cat] ?? { top: 0, height: 40, zIndex: 1 };
              const updateSlot = (patch: Partial<typeof slot>) =>
                outfitConfig.set({
                  mannequinSlots: {
                    ...cfg.mannequinSlots,
                    [cat]: { ...slot, ...patch },
                  },
                });
              return (
                <div key={cat} className="space-y-1.5 pb-3 border-b border-border/40 last:border-0">
                  <span className="text-xs font-medium">{cat}</span>
                  <SliderRow
                    label="Top"
                    value={slot.top}
                    min={0}
                    max={90}
                    step={1}
                    suffix="%"
                    onChange={(v) => updateSlot({ top: v })}
                  />
                  <SliderRow
                    label="Height"
                    value={slot.height}
                    min={5}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(v) => updateSlot({ height: v })}
                  />
                  <SliderRow
                    label="Z-Index"
                    value={slot.zIndex}
                    min={0}
                    max={10}
                    step={1}
                    onChange={(v) => updateSlot({ zIndex: v })}
                  />
                </div>
              );
            })}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Subcategory overrides
            </h3>
            {ALL_SUBCATEGORIES.map((sub) => {
              const slot = cfg.subcategorySlots?.[sub] ?? { top: 0, height: 40, zIndex: 1 };
              const updateSlot = (patch: Partial<typeof slot>) =>
                outfitConfig.set({
                  subcategorySlots: {
                    ...cfg.subcategorySlots,
                    [sub]: { ...slot, ...patch },
                  },
                });
              return (
                <div key={sub} className="space-y-1.5 pb-3 border-b border-border/40 last:border-0">
                  <span className="text-xs font-medium">{sub}</span>
                  <SliderRow
                    label="Top"
                    value={slot.top}
                    min={0}
                    max={90}
                    step={1}
                    suffix="%"
                    onChange={(v) => updateSlot({ top: v })}
                  />
                  <SliderRow
                    label="Height"
                    value={slot.height}
                    min={5}
                    max={100}
                    step={1}
                    suffix="%"
                    onChange={(v) => updateSlot({ height: v })}
                  />
                  <SliderRow
                    label="Z-Index"
                    value={slot.zIndex}
                    min={0}
                    max={10}
                    step={1}
                    onChange={(v) => updateSlot({ zIndex: v })}
                  />
                </div>
              );
            })}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Render order (top → bottom)
            </h3>
            <div className="space-y-1.5">
              {cfg.categoryOrder.map((cat, idx) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="text-xs flex-1">{cat}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    disabled={idx === 0}
                    onClick={() => {
                      const next = [...cfg.categoryOrder];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      outfitConfig.set({ categoryOrder: next });
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    disabled={idx === cfg.categoryOrder.length - 1}
                    onClick={() => {
                      const next = [...cfg.categoryOrder];
                      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                      outfitConfig.set({ categoryOrder: next });
                    }}
                  >
                    ↓
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
