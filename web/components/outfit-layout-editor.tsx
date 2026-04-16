"use client";

import { useRef, useState, useMemo, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronUp, ChevronDown, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { imageUrl, updateOutfitLayout } from "@/lib/api";
import type { OutfitItem, Outfit, OutfitItemLayout } from "@/lib/types";

interface Props {
  outfit: Outfit;
  onSave: (updated: Outfit) => void;
  onCancel: () => void;
}

interface Layout {
  position_x: number;
  position_y: number;
  scale: number;
  z_index: number;
}

const defaultLayout: Layout = { position_x: 0, position_y: 0, scale: 1, z_index: 0 };

function itemSrc(item: OutfitItem): string | null {
  if (item.image_status === "done" && item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return null;
}

export function OutfitLayoutEditor({ outfit, onSave, onCancel }: Props) {
  const items = useMemo(() => outfit.items ?? [], [outfit.items]);

  const [layouts, setLayouts] = useState<Record<string, Layout>>(() => {
    const map: Record<string, Layout> = {};
    for (const it of items) {
      map[it.id] = {
        position_x: it.position_x,
        position_y: it.position_y,
        scale: it.scale,
        z_index: it.z_index,
      };
    }
    return map;
  });
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    width: number;
    height: number;
  } | null>(null);

  const updateLayout = (id: string, patch: Partial<Layout>) => {
    setLayouts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    const layout = layouts[id];
    dragState.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      startPosX: layout.position_x,
      startPosY: layout.position_y,
      width: rect.width,
      height: rect.height,
    };
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds) return;
    const dx = ((e.clientX - ds.startX) / ds.width) * 100;
    const dy = ((e.clientY - ds.startY) / ds.height) * 100;
    updateLayout(ds.id, {
      position_x: clamp(ds.startPosX + dx, -80, 80),
      position_y: clamp(ds.startPosY + dy, -80, 80),
    });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragState.current) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragState.current = null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: OutfitItemLayout[] = items.map((it) => ({
        clothing_item_id: it.id,
        ...layouts[it.id],
      }));
      const updated = await updateOutfitLayout(outfit.id, payload);
      onSave(updated);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    const map: Record<string, Layout> = {};
    for (const it of items) map[it.id] = { ...defaultLayout };
    setLayouts(map);
  };

  const handleResetSelected = () => {
    if (selectedId) updateLayout(selectedId, defaultLayout);
  };

  const handleZ = (delta: number) => {
    if (!selectedId) return;
    updateLayout(selectedId, {
      z_index: clamp(layouts[selectedId].z_index + delta, -10, 10),
    });
  };

  const sortedForRender = [...items].sort(
    (a, b) => (layouts[a.id]?.z_index ?? 0) - (layouts[b.id]?.z_index ?? 0),
  );
  const selected = selectedId ? layouts[selectedId] : null;

  return (
    <div className="space-y-4">
      <div
        ref={canvasRef}
        className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-muted/30 rounded-lg overflow-hidden touch-none select-none"
      >
        {sortedForRender.map((item) => {
          const layout = layouts[item.id];
          const src = itemSrc(item);
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              onPointerDown={(e) => onPointerDown(e, item.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className={`absolute inset-0 flex items-center justify-center cursor-move ${
                isSelected ? "outline outline-2 outline-primary outline-offset-[-4px]" : ""
              }`}
              style={{
                transform: `translate(${layout.position_x}%, ${layout.position_y}%) scale(${layout.scale})`,
                zIndex: layout.z_index + 100,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.category}
                  draggable={false}
                  className="max-w-[60%] max-h-[60%] object-contain pointer-events-none"
                />
              ) : (
                <span className="text-xl text-muted-foreground/50">👕</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-3 max-w-sm mx-auto">
        <div className="flex gap-1.5 flex-wrap">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setSelectedId(it.id)}
              className={`px-2.5 py-1 rounded text-xs border ${
                it.id === selectedId
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border"
              }`}
            >
              {it.category}
            </button>
          ))}
        </div>

        {selected && selectedId && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/40">
            <div className="space-y-1">
              <Label className="text-xs">Scale: {selected.scale.toFixed(2)}x</Label>
              <input
                type="range"
                min="0.4"
                max="2"
                step="0.05"
                value={selected.scale}
                onChange={(e) =>
                  updateLayout(selectedId, { scale: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Layer: {selected.z_index}
              </span>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleZ(1)}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleZ(-1)}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleResetSelected}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Saving
              </>
            ) : (
              "Save layout"
            )}
          </Button>
          <Button variant="outline" onClick={handleResetAll} disabled={saving}>
            Reset all
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
