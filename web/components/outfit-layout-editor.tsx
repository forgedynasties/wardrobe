"use client";

import { useCallback, useRef, useState } from "react";
import { thumbnailUrl } from "@/lib/api";
import { ShimmerImg } from "@/components/shimmer-img";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
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

function dist(p1: PointerEvent, p2: PointerEvent) {
  return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
}

export function OutfitLayoutEditor({ items, onSave, onCancel }: Props) {
  const [layouts, setLayouts] = useState<Map<string, ItemLayout>>(() => {
    const m = new Map<string, ItemLayout>();
    items.forEach((item, idx) => {
      m.set(item.id, {
        position_x: item.position_x ?? 0,
        position_y: item.position_y ?? 0,
        scale: item.scale && item.scale > 0 ? item.scale : 1,
        z_index: item.z_index ?? idx,
      });
    });
    return m;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Drag state
  const dragRef = useRef<{
    itemId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    pointerId: number;
  } | null>(null);

  // Pinch state
  const pinchRef = useRef<{
    itemId: string;
    pointer1: PointerEvent;
    pointer2: PointerEvent;
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

  const handlePointerDown = (e: React.PointerEvent, itemId: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, e.nativeEvent);
    setSelectedId(itemId);

    const pointers = [...activePointers.current.values()].filter(p =>
      // only count pointers on the same item
      true
    );

    if (activePointers.current.size === 2) {
      // Start pinch
      const [p1, p2] = [...activePointers.current.values()];
      const layout = layouts.get(itemId);
      if (layout) {
        pinchRef.current = {
          itemId,
          pointer1: p1,
          pointer2: p2,
          origScale: layout.scale,
          origDist: dist(p1, p2),
        };
      }
      dragRef.current = null;
    } else {
      // Start drag
      const layout = layouts.get(itemId);
      if (layout) {
        dragRef.current = {
          itemId,
          startX: e.clientX,
          startY: e.clientY,
          origX: layout.position_x,
          origY: layout.position_y,
          pointerId: e.pointerId,
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
      const newDist = dist(p1, p2);
      const ratio = newDist / pinch.origDist;
      const newScale = clamp(pinch.origScale * ratio, 0.3, 3.0);
      updateLayout(pinch.itemId, { scale: newScale });
      return;
    }

    if (!dragRef.current) return;
    const drag = dragRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dx = ((e.clientX - drag.startX) / rect.width) * 100;
    const dy = ((e.clientY - drag.startY) / rect.height) * 100;

    updateLayout(drag.itemId, {
      position_x: clamp(drag.origX + dx, -60, 60),
      position_y: clamp(drag.origY + dy, -60, 60),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) {
      pinchRef.current = null;
    }
    if (activePointers.current.size === 0) {
      dragRef.current = null;
    }
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

  const handleReset = () => {
    setLayouts(prev => {
      const next = new Map(prev);
      for (const [id, l] of next) {
        next.set(id, { ...l, position_x: 0, position_y: 0 });
      }
      return next;
    });
  };

  const moveLayer = (id: string, dir: 1 | -1) => {
    const layout = layouts.get(id);
    if (!layout) return;
    updateLayout(id, { z_index: layout.z_index + dir });
  };

  const sortedItems = [...items].sort((a, b) => {
    const az = layouts.get(a.id)?.z_index ?? 0;
    const bz = layouts.get(b.id)?.z_index ?? 0;
    return az - bz;
  });

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

      {/* canvas */}
      <div className="relative aspect-[3/4] w-full bg-muted/30 rounded-xl overflow-hidden border touch-none select-none">
        <div
          ref={canvasRef}
          className="absolute inset-0"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={() => setSelectedId(null)}
        >
          {sortedItems.map((item) => {
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
                }}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
              >
                {/* selection ring */}
                {isSelected && (
                  <div className="absolute inset-[15%] rounded-lg ring-2 ring-primary/70 ring-offset-0 pointer-events-none" />
                )}
                {src ? (
                  <ShimmerImg
                    src={src}
                    alt={item.category}
                    className="w-full h-full object-contain pointer-events-none"
                  />
                ) : (
                  <span className="text-4xl pointer-events-none">👕</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* controls */}
      <div className="rounded-xl border bg-card p-3 space-y-3">
        {selectedItem && selectedLayout ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium capitalize">
                {selectedItem.sub_category || selectedItem.category}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mr-1">Layer</span>
                <Button
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLayer(selectedItem.id, -1)}
                  title="Send back"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline" size="icon"
                  className="h-7 w-7"
                  onClick={() => moveLayer(selectedItem.id, 1)}
                  title="Bring forward"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Scale</span>
              <input
                type="range"
                min="0.3"
                max="3.0"
                step="0.05"
                value={selectedLayout.scale}
                onChange={e => updateLayout(selectedItem.id, { scale: parseFloat(e.target.value) })}
                className="flex-1 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
                {selectedLayout.scale.toFixed(2)}×
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-1">
            Tap an item to select it
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
