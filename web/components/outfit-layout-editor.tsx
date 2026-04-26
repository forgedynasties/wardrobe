"use client";

import { useCallback, useRef, useState } from "react";
import { thumbnailUrl } from "@/lib/api";
import { outfitConfig } from "@/lib/outfit-config";
import { ShimmerImg } from "@/components/shimmer-img";
import { Button } from "@/components/ui/button";
import { RotateCcw, GripVertical } from "lucide-react";
import type { OutfitItem, OutfitItemLayoutUpdate } from "@/lib/types";

interface ItemLayout {
  position_x: number;
  position_y: number;
  scale: number;
  z_index: number;
}

interface Props {
  items: OutfitItem[];
  onSave: (layouts: OutfitItemLayoutUpdate[]) => Promise<void>;
  onCancel: () => void;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function pointerDist(p1: PointerEvent, p2: PointerEvent) {
  return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
}

const DEFAULT_SLOT = { top: 20, height: 40, zIndex: 1 };

function initLayouts(items: OutfitItem[]): Map<string, ItemLayout> {
  const m = new Map<string, ItemLayout>();
  const cfg = outfitConfig.get();
  const hasCustom = items.some(i => i.position_x !== 0 || i.position_y !== 0);

  items.forEach((item, idx) => {
    if (hasCustom) {
      m.set(item.id, {
        position_x: item.position_x ?? 0,
        position_y: item.position_y ?? 0,
        scale: item.scale && item.scale > 0 ? item.scale : 1,
        z_index: item.z_index ?? idx,
      });
    } else {
      // Convert mannequin slot → editor coordinates
      const subSlot = item.sub_category ? cfg.subcategorySlots[item.sub_category] : undefined;
      const slot = subSlot ?? cfg.mannequinSlots[item.category] ?? DEFAULT_SLOT;
      m.set(item.id, {
        position_x: slot.left !== undefined ? slot.left - 50 : 0,
        position_y: slot.top + slot.height / 2 - 50,
        scale: slot.height / 100,
        z_index: slot.zIndex ?? idx,
      });
    }
  });
  return m;
}

export function OutfitLayoutEditor({ items, onSave, onCancel }: Props) {
  const [layouts, setLayouts] = useState<Map<string, ItemLayout>>(() => initLayouts(items));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    hasMoved: boolean;
  } | null>(null);

  const pinchRef = useRef<{
    itemId: string;
    origScale: number;
    origDist: number;
  } | null>(null);

  const activePointers = useRef<Map<number, PointerEvent>>(new Map());

  const updateLayout = useCallback((id: string, patch: Partial<ItemLayout>) => {
    setLayouts(prev => {
      const next = new Map(prev);
      const cur = next.get(id)!;
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }, []);

  // Canvas item sorted bottom→front for rendering
  const canvasSorted = [...items].sort((a, b) => {
    const az = layouts.get(a.id)?.z_index ?? 0;
    const bz = layouts.get(b.id)?.z_index ?? 0;
    return az - bz;
  });

  // Layer panel sorted front→back (top of list = front)
  const layersSorted = [...canvasSorted].reverse();

  const handlePointerDown = (e: React.PointerEvent, itemId: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, e.nativeEvent);

    if (activePointers.current.size >= 2) {
      const [p1, p2] = [...activePointers.current.values()];
      const layout = layouts.get(itemId);
      if (layout) {
        pinchRef.current = {
          itemId,
          origScale: layout.scale,
          origDist: pointerDist(p1, p2),
        };
      }
      dragRef.current = null;
    } else {
      const layout = layouts.get(itemId);
      if (layout) {
        dragRef.current = {
          itemId,
          startX: e.clientX,
          startY: e.clientY,
          origX: layout.position_x,
          origY: layout.position_y,
          hasMoved: false,
        };
      }
      pinchRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, e.nativeEvent);

    if (pinchRef.current && activePointers.current.size >= 2) {
      const [p1, p2] = [...activePointers.current.values()];
      const pinch = pinchRef.current;
      const newDist = pointerDist(p1, p2);
      const ratio = newDist / pinch.origDist;
      updateLayout(pinch.itemId, { scale: clamp(pinch.origScale * ratio, 0.1, 3.0) });
      return;
    }

    if (!dragRef.current) return;
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    if (moved > 4) drag.hasMoved = true;
    if (!drag.hasMoved) return;

    const rect = canvas.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;
    updateLayout(drag.itemId, {
      position_x: clamp(drag.origX + dx, -70, 70),
      position_y: clamp(drag.origY + dy, -70, 70),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // Select on click (no movement) — toggle if clicking same item
    if (dragRef.current && !dragRef.current.hasMoved) {
      const clickedId = dragRef.current.itemId;
      setSelectedId(prev => (prev === clickedId ? null : clickedId));
    }
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (activePointers.current.size === 0) dragRef.current = null;
  };

  // Layer panel drag-to-reorder
  const handleLayerDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragLayerId || dragLayerId === targetId) return;

    setLayouts(prev => {
      const next = new Map(prev);
      const fromZ = next.get(dragLayerId)!.z_index;
      const toZ = next.get(targetId)!.z_index;
      next.set(dragLayerId, { ...next.get(dragLayerId)!, z_index: toZ });
      next.set(targetId, { ...next.get(targetId)!, z_index: fromZ });
      return next;
    });
  };

  const handleReset = () => {
    setLayouts(prev => {
      const next = new Map(prev);
      for (const [id, l] of next) {
        next.set(id, { ...l, position_x: 0, position_y: 0 });
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: OutfitItemLayoutUpdate[] = items.map(item => {
        const l = layouts.get(item.id) ?? { position_x: 0, position_y: 0, scale: 1, z_index: 0 };
        return { item_id: item.id, ...l };
      });
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = items.find(i => i.id === selectedId);
  const selectedLayout = selectedId ? layouts.get(selectedId) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <span className="text-sm font-medium text-muted-foreground">Edit Layout</span>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* canvas + layer panel */}
      <div className="flex gap-3 items-start">
        {/* canvas */}
        <div className="flex-1 min-w-0 relative aspect-[3/4] bg-muted/30 rounded-xl overflow-hidden border touch-none select-none">
          <div
            ref={canvasRef}
            className="absolute inset-0"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {canvasSorted.map((item) => {
              const src = thumbnailUrl(item) || null;
              const layout = layouts.get(item.id) ?? { position_x: 0, position_y: 0, scale: 1, z_index: 0 };
              const isSelected = selectedId === item.id;
              const effectiveScale = layout.scale * (item.display_scale || 1);

              return (
                <div
                  key={item.id}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${layout.position_x}%, ${layout.position_y}%) scale(${effectiveScale})`,
                    zIndex: layout.z_index + 1,
                    cursor: "grab",
                    outline: isSelected ? "2px solid hsl(var(--primary))" : "none",
                    outlineOffset: "-2px",
                  }}
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                >
                  {src ? (
                    <ShimmerImg
                      src={src}
                      alt={item.category}
                      className="w-full h-full object-contain pointer-events-none"
                      style={isSelected ? { filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.7))" } : undefined}
                    />
                  ) : (
                    <span className="text-4xl pointer-events-none">👕</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* layer panel */}
        <div className="w-28 shrink-0 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Layers
          </p>
          {layersSorted.map((item) => {
            const src = thumbnailUrl(item) || null;
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragLayerId(item.id)}
                onDragEnd={() => setDragLayerId(null)}
                onDragOver={(e) => handleLayerDragOver(e, item.id)}
                onClick={() => setSelectedId(prev => prev === item.id ? null : item.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 cursor-pointer transition-colors ${
                  isSelected
                    ? "border-primary/60 bg-primary/10"
                    : "border-border bg-card hover:bg-muted/40"
                } ${dragLayerId === item.id ? "opacity-40" : ""}`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <div className="w-7 h-7 shrink-0 bg-muted/40 rounded flex items-center justify-center overflow-hidden">
                  {src ? (
                    <img
                      src={src}
                      alt={item.category}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="text-sm">👕</span>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate capitalize leading-tight">
                  {item.sub_category || item.category}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* item controls */}
      <div className="rounded-xl border bg-card p-3 space-y-3">
        {selectedItem && selectedLayout ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10 shrink-0">Scale</span>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={selectedLayout.scale}
              onChange={e => updateLayout(selectedItem.id, { scale: parseFloat(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums shrink-0">
              {selectedLayout.scale.toFixed(2)}×
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Click an item or layer to select
          </p>
        )}

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to auto layout
        </button>
      </div>
    </div>
  );
}
