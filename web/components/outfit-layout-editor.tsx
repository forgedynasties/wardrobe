"use client";

import { useRef, useState, useMemo, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronUp, ChevronDown, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { imageUrl, updateOutfitLayout } from "@/lib/api";
import { outfitConfig } from "@/lib/outfit-config";
import type { OutfitItem, Outfit, OutfitItemLayout } from "@/lib/types";

interface Props {
  outfit: Outfit;
  onSave: (updated: Outfit) => void;
  onCancel: () => void;
}

interface Layout {
  position_x: number;
  position_y: number;
  z_index: number;
}

interface HitEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

function itemSrc(item: OutfitItem): string | null {
  if (item.image_status === "done" && item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return null;
}

const fallbackSlot = { top: 20, height: 40, zIndex: 1 };

function computeDefaultLayouts(items: OutfitItem[]): Record<string, Layout> {
  const cfg = outfitConfig.get();
  const map: Record<string, Layout> = {};
  for (const it of items) {
    if (it.position_x !== 0 || it.position_y !== 0) {
      map[it.id] = { position_x: it.position_x, position_y: it.position_y, z_index: it.z_index };
    } else {
      const subSlot = it.sub_category ? cfg.subcategorySlots[it.sub_category] : undefined;
      const slot = subSlot ?? cfg.mannequinSlots[it.category] ?? fallbackSlot;
      const hasCustomX = slot.left !== undefined;
      const slotWidth = slot.width ?? 80;
      map[it.id] = {
        position_x: hasCustomX ? slot.left! + slotWidth / 2 - 50 : 0,
        position_y: slot.top + slot.height / 2 - 50,
        z_index: it.z_index !== 0 ? it.z_index : (cfg.categoryZIndex[it.category] ?? slot.zIndex),
      };
    }
  }
  return map;
}

export function OutfitLayoutEditor({ outfit, onSave, onCancel }: Props) {
  const items = useMemo(() => outfit.items ?? [], [outfit.items]);

  const [layouts, setLayouts] = useState<Record<string, Layout>>(
    () => computeDefaultLayouts(items),
  );
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const hitMap = useRef<Map<string, HitEntry>>(new Map());
  const dragState = useRef<{
    id: string;
    startX: number;
    startY: number;
    startPosX: number;
    startPosY: number;
    width: number;
    height: number;
  } | null>(null);

  const registerHit = useCallback((id: string, img: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    hitMap.current.set(id, { canvas, ctx });
  }, []);

  const hitTest = (id: string, clientX: number, clientY: number, rect: DOMRect): boolean => {
    const layout = layouts[id];
    const entry = hitMap.current.get(id);
    if (!entry) return true;

    const cW = rect.width;
    const cH = rect.height;

    // Un-translate click into item-div local space (item div is inset-0 = canvas size)
    const localX = (clientX - rect.left) - (layout.position_x / 100) * cW;
    const localY = (clientY - rect.top) - (layout.position_y / 100) * cH;

    // Compute object-contain image bounds within the div
    const { canvas, ctx } = entry;
    const scale = Math.min(cW / canvas.width, cH / canvas.height);
    const displayW = canvas.width * scale;
    const displayH = canvas.height * scale;
    const imgLeft = (cW - displayW) / 2;
    const imgTop = (cH - displayH) / 2;

    if (localX < imgLeft || localX > imgLeft + displayW) return false;
    if (localY < imgTop || localY > imgTop + displayH) return false;

    const pixX = Math.floor(((localX - imgLeft) / displayW) * canvas.width);
    const pixY = Math.floor(((localY - imgTop) / displayH) * canvas.height);
    return ctx.getImageData(pixX, pixY, 1, 1).data[3] > 10;
  };

  const updateLayout = (id: string, patch: Partial<Layout>) => {
    setLayouts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // Highest z-index first — checked first on pointer down
  const sortedByZDesc = useMemo(
    () => [...items].sort((a, b) => (layouts[b.id]?.z_index ?? 0) - (layouts[a.id]?.z_index ?? 0)),
    [items, layouts],
  );

  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();

    for (const item of sortedByZDesc) {
      if (hitTest(item.id, e.clientX, e.clientY, rect)) {
        const layout = layouts[item.id];
        dragState.current = {
          id: item.id,
          startX: e.clientX,
          startY: e.clientY,
          startPosX: layout.position_x,
          startPosY: layout.position_y,
          width: rect.width,
          height: rect.height,
        };
        setSelectedId(item.id);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
    }
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
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      dragState.current = null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: OutfitItemLayout[] = items.map((it) => ({
        clothing_item_id: it.id,
        ...layouts[it.id],
        scale: 1,
      }));
      const updated = await updateOutfitLayout(outfit.id, payload);
      onSave(updated);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  const handleResetAll = () => setLayouts(computeDefaultLayouts(items));

  const handleResetSelected = () => {
    if (!selectedId) return;
    const cfg = outfitConfig.get();
    const item = items.find((i) => i.id === selectedId);
    if (!item) return;
    const subSlot = item.sub_category ? cfg.subcategorySlots[item.sub_category] : undefined;
    const slot = subSlot ?? cfg.mannequinSlots[item.category] ?? fallbackSlot;
    const hasCustomX = slot.left !== undefined;
    const slotWidth = slot.width ?? 80;
    updateLayout(selectedId, {
      position_x: hasCustomX ? slot.left! + slotWidth / 2 - 50 : 0,
      position_y: slot.top + slot.height / 2 - 50,
      z_index: cfg.categoryZIndex[item.category] ?? slot.zIndex,
    });
  };

  const handleZ = (delta: number) => {
    if (!selectedId) return;
    updateLayout(selectedId, {
      z_index: clamp(layouts[selectedId].z_index + delta, -10, 10),
    });
  };

  const sortedForRender = useMemo(
    () => [...items].sort((a, b) => (layouts[a.id]?.z_index ?? 0) - (layouts[b.id]?.z_index ?? 0)),
    [items, layouts],
  );
  const selected = selectedId ? layouts[selectedId] : null;

  return (
    <div className="space-y-4">
      <div
        ref={canvasRef}
        className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-muted/30 rounded-lg overflow-hidden touch-none select-none cursor-move"
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {sortedForRender.map((item) => {
          const layout = layouts[item.id];
          const src = itemSrc(item);
          const isSelected = item.id === selectedId;
          return (
            <div
              key={item.id}
              className={`absolute inset-0 flex items-center justify-center pointer-events-none ${
                isSelected ? "outline outline-2 outline-primary outline-offset-[-4px]" : ""
              }`}
              style={{
                transform: `translate(${layout.position_x}%, ${layout.position_y}%)`,
                zIndex: layout.z_index + 100,
              }}
            >
              {src ? (
                <img
                  src={src}
                  alt={item.category}
                  draggable={false}
                  className="w-full h-full object-contain pointer-events-none"
                  onLoad={(e) => registerHit(item.id, e.currentTarget)}
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
