"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  rotation: number;
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
        rotation: item.rotation ?? 0,
      });
    } else {
      const subSlot = item.sub_category ? cfg.subcategorySlots[item.sub_category] : undefined;
      const slot = subSlot ?? cfg.mannequinSlots[item.category] ?? DEFAULT_SLOT;
      m.set(item.id, {
        position_x: slot.left !== undefined ? slot.left - 50 : 0,
        position_y: slot.top + slot.height / 2 - 50,
        scale: (slot.height / 100) / (item.display_scale || 1),
        z_index: slot.zIndex ?? idx,
        rotation: 0,
      });
    }
  });
  return m;
}

type NaturalDims = Map<string, { w: number; h: number }>;

// Returns the object-contain rendered rect (px) for an image inside a container.
function containBox(cW: number, cH: number, iW: number, iH: number) {
  const s = Math.min(cW / iW, cH / iH);
  const w = iW * s;
  const h = iH * s;
  return { left: (cW - w) / 2, top: (cH - h) / 2, width: w, height: h };
}

// Returns true if canvas-space point (px, py) is inside the item's (possibly rotated) bounding box.
function hitTest(
  px: number, py: number,
  layout: ItemLayout,
  dims: { w: number; h: number } | undefined,
  canvasW: number, canvasH: number,
  displayScale: number,
): boolean {
  const effectiveScale = layout.scale * displayScale;
  const cx = canvasW / 2 + (layout.position_x / 100) * canvasW;
  const cy = canvasH / 2 + (layout.position_y / 100) * canvasH;

  if (dims) {
    const box = containBox(canvasW, canvasH, dims.w, dims.h);
    const halfW = (box.width * effectiveScale) / 2;
    const halfH = (box.height * effectiveScale) / 2;
    const rot = -(layout.rotation * Math.PI) / 180;
    const dx = px - cx;
    const dy = py - cy;
    const lx = dx * Math.cos(rot) - dy * Math.sin(rot);
    const ly = dx * Math.sin(rot) + dy * Math.cos(rot);
    return Math.abs(lx) <= halfW && Math.abs(ly) <= halfH;
  }
  // Fallback before dims load: circle around center
  return Math.hypot(px - cx, py - cy) < canvasW * 0.3 * effectiveScale;
}

export function OutfitLayoutEditor({ items, onSave, onCancel }: Props) {
  const [layouts, setLayouts] = useState<Map<string, ItemLayout>>(() => initLayouts(items));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [naturalDims, setNaturalDims] = useState<NaturalDims>(new Map());

  const canvasRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    itemId: string;
    startX: number; startY: number;
    origX: number; origY: number;
    hasMoved: boolean;
  } | null>(null);

  const pinchRef = useRef<{
    itemId: string;
    origScale: number;
    origDist: number;
  } | null>(null);

  const handleDragRef = useRef<{
    type: "scale" | "rotate";
    itemId: string;
    origScale: number;
    origRotation: number;
    centerX: number; centerY: number;
    origDist: number;
    origAngle: number;
  } | null>(null);

  const activePointers = useRef<Map<number, PointerEvent>>(new Map());

  // Load natural image dimensions for all items via Image objects (browser cache hit).
  useEffect(() => {
    items.forEach(item => {
      const src = thumbnailUrl(item);
      if (!src) return;
      setNaturalDims(prev => {
        if (prev.has(item.id)) return prev;
        const img = new window.Image();
        img.onload = () => {
          setNaturalDims(d => {
            if (d.has(item.id)) return d;
            const next = new Map(d);
            next.set(item.id, { w: img.naturalWidth, h: img.naturalHeight });
            return next;
          });
        };
        img.src = src;
        return prev;
      });
    });
  }, [items]);

  const updateLayout = useCallback((id: string, patch: Partial<ItemLayout>) => {
    setLayouts(prev => {
      const next = new Map(prev);
      const cur = next.get(id)!;
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }, []);

  const canvasSorted = [...items].sort((a, b) => {
    const az = layouts.get(a.id)?.z_index ?? 0;
    const bz = layouts.get(b.id)?.z_index ?? 0;
    return az - bz;
  });
  const layersSorted = [...canvasSorted].reverse();

  // ── Canvas-level pointer handling with hit testing ─────────────────────────

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // Handles capture their own events; don't double-process
    if (handleDragRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Hit test front-to-back (highest z_index first)
    const frontToBack = [...items].sort((a, b) => {
      const az = layouts.get(a.id)?.z_index ?? 0;
      const bz = layouts.get(b.id)?.z_index ?? 0;
      return bz - az;
    });

    let hit: OutfitItem | null = null;
    for (const item of frontToBack) {
      const layout = layouts.get(item.id);
      if (!layout) continue;
      if (hitTest(px, py, layout, naturalDims.get(item.id), canvas.clientWidth, canvas.clientHeight, item.display_scale || 1)) {
        hit = item;
        break;
      }
    }

    if (!hit) {
      setSelectedId(null);
      return;
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, e.nativeEvent);
    const itemId = hit.id;

    if (activePointers.current.size >= 2) {
      const [p1, p2] = [...activePointers.current.values()];
      const layout = layouts.get(itemId);
      if (layout) pinchRef.current = { itemId, origScale: layout.scale, origDist: pointerDist(p1, p2) };
      dragRef.current = null;
    } else {
      const layout = layouts.get(itemId);
      if (layout) {
        dragRef.current = {
          itemId,
          startX: e.clientX, startY: e.clientY,
          origX: layout.position_x, origY: layout.position_y,
          hasMoved: false,
        };
      }
      pinchRef.current = null;
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    activePointers.current.set(e.pointerId, e.nativeEvent);

    // Handle drag
    if (handleDragRef.current) {
      const h = handleDragRef.current;
      const dx = e.clientX - h.centerX;
      const dy = e.clientY - h.centerY;
      if (h.type === "scale") {
        const newDist = Math.hypot(dx, dy);
        if (h.origDist > 1) updateLayout(h.itemId, { scale: clamp(h.origScale * (newDist / h.origDist), 0.05, 4.0) });
      } else {
        const angle = Math.atan2(dy, dx);
        updateLayout(h.itemId, { rotation: h.origRotation + ((angle - h.origAngle) * 180) / Math.PI });
      }
      return;
    }

    if (pinchRef.current && activePointers.current.size >= 2) {
      const [p1, p2] = [...activePointers.current.values()];
      const { itemId, origScale, origDist } = pinchRef.current;
      updateLayout(itemId, { scale: clamp(origScale * (pointerDist(p1, p2) / origDist), 0.1, 3.0) });
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
    updateLayout(drag.itemId, {
      position_x: clamp(drag.origX + ((e.clientX - drag.startX) / rect.width) * 100, -70, 70),
      position_y: clamp(drag.origY + ((e.clientY - drag.startY) / rect.height) * 100, -70, 70),
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (handleDragRef.current) {
      handleDragRef.current = null;
    } else if (dragRef.current && !dragRef.current.hasMoved) {
      const clickedId = dragRef.current.itemId;
      setSelectedId(prev => prev === clickedId ? null : clickedId);
    }
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (activePointers.current.size === 0) dragRef.current = null;
  };

  // ── Handle pointer down (captured on handle element itself) ────────────────

  const onHandlePointerDown = (e: React.PointerEvent, type: "scale" | "rotate", itemId: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    const layout = layouts.get(itemId);
    if (!canvas || !layout) return;

    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width * (0.5 + layout.position_x / 100);
    const centerY = rect.top + rect.height * (0.5 + layout.position_y / 100);
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    handleDragRef.current = {
      type, itemId,
      origScale: layout.scale,
      origRotation: layout.rotation,
      centerX, centerY,
      origDist: Math.hypot(dx, dy),
      origAngle: Math.atan2(dy, dx),
    };
  };

  // ── Layer panel drag-to-reorder ────────────────────────────────────────────

  const layerDragOver = (e: React.DragEvent, targetId: string) => {
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
    const cfg = outfitConfig.get();
    setLayouts(() => {
      const next = new Map<string, ItemLayout>();
      items.forEach((item, idx) => {
        const subSlot = item.sub_category ? cfg.subcategorySlots[item.sub_category] : undefined;
        const slot = subSlot ?? cfg.mannequinSlots[item.category] ?? DEFAULT_SLOT;
        next.set(item.id, {
          position_x: slot.left !== undefined ? slot.left - 50 : 0,
          position_y: slot.top + slot.height / 2 - 50,
          scale: (slot.height / 100) / (item.display_scale || 1),
          z_index: slot.zIndex ?? idx,
          rotation: 0,
        });
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(items.map(item => {
        const l = layouts.get(item.id) ?? { position_x: 0, position_y: 0, scale: 1, z_index: 0, rotation: 0 };
        return { item_id: item.id, ...l };
      }));
    } finally {
      setSaving(false);
    }
  };

  // ── Bounding box overlay ───────────────────────────────────────────────────

  const selectedItem = items.find(i => i.id === selectedId);
  const selectedLayout = selectedId ? layouts.get(selectedId) : null;

  function getBBox(item: OutfitItem, layout: ItemLayout) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dims = naturalDims.get(item.id);
    if (!dims) return null;

    const cW = canvas.clientWidth;
    const cH = canvas.clientHeight;
    const effectiveScale = layout.scale * (item.display_scale || 1);
    const box = containBox(cW, cH, dims.w, dims.h);
    const scaledW = box.width * effectiveScale;
    const scaledH = box.height * effectiveScale;
    const cx = cW / 2 + (layout.position_x / 100) * cW;
    const cy = cH / 2 + (layout.position_y / 100) * cH;

    return { left: cx - scaledW / 2, top: cy - scaledH / 2, width: scaledW, height: scaledH };
  }

  const HANDLE = 14;
  const ROT_STEM = 26;
  const h2 = HANDLE / 2;

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <span className="text-sm font-medium text-muted-foreground">Edit Layout</span>
        <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>

      {/* canvas + layer panel */}
      <div className="flex gap-3 items-start">
        {/* canvas */}
        <div className="flex-1 min-w-0 relative aspect-[3/4] bg-muted/30 rounded-xl overflow-hidden border touch-none select-none">
          <div
            ref={canvasRef}
            className="absolute inset-0"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerCancel={handleCanvasPointerUp}
          >
            {canvasSorted.map((item) => {
              const src = thumbnailUrl(item) || null;
              const layout = layouts.get(item.id) ?? { position_x: 0, position_y: 0, scale: 1, z_index: 0, rotation: 0 };
              const effectiveScale = layout.scale * (item.display_scale || 1);

              return (
                <div
                  key={item.id}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${layout.position_x}%, ${layout.position_y}%)`,
                    zIndex: layout.z_index + 1,
                  }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ transform: `scale(${effectiveScale}) rotate(${layout.rotation}deg)` }}
                  >
                    {src ? (
                      <ShimmerImg
                        src={src}
                        alt={item.category}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-4xl">👕</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bounding box overlay */}
            {selectedItem && selectedLayout && (() => {
              const bbox = getBBox(selectedItem, selectedLayout);
              if (!bbox) return null;

              return (
                <div
                  style={{
                    position: "absolute",
                    left: bbox.left,
                    top: bbox.top,
                    width: bbox.width,
                    height: bbox.height,
                    transform: `rotate(${selectedLayout.rotation}deg)`,
                    transformOrigin: "center",
                    zIndex: 9999,
                    pointerEvents: "none",
                  }}
                >
                  {/* Box outline */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      border: "2px solid hsl(var(--primary))",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Corner scale handles */}
                  {([
                    { k: "tl", style: { top: -h2, left: -h2 }, cursor: "nw-resize" },
                    { k: "tr", style: { top: -h2, right: -h2 }, cursor: "ne-resize" },
                    { k: "bl", style: { bottom: -h2, left: -h2 }, cursor: "sw-resize" },
                    { k: "br", style: { bottom: -h2, right: -h2 }, cursor: "se-resize" },
                  ] as const).map(({ k, style, cursor }) => (
                    <div
                      key={k}
                      style={{
                        position: "absolute",
                        width: HANDLE,
                        height: HANDLE,
                        background: "hsl(var(--background))",
                        border: "2px solid hsl(var(--primary))",
                        borderRadius: 3,
                        cursor,
                        pointerEvents: "all",
                        ...style,
                      }}
                      onPointerDown={(e) => onHandlePointerDown(e, "scale", selectedItem.id)}
                    />
                  ))}

                  {/* Rotation handle — circle above top center, connected by a line */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: -(ROT_STEM + HANDLE),
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      pointerEvents: "all",
                      cursor: "crosshair",
                    }}
                    onPointerDown={(e) => onHandlePointerDown(e, "rotate", selectedItem.id)}
                  >
                    {/* circle */}
                    <div
                      style={{
                        width: HANDLE,
                        height: HANDLE,
                        background: "hsl(var(--background))",
                        border: "2px solid hsl(var(--primary))",
                        borderRadius: "50%",
                        flexShrink: 0,
                        pointerEvents: "none",
                      }}
                    />
                    {/* stem */}
                    <div
                      style={{
                        width: 2,
                        height: ROT_STEM,
                        background: "hsl(var(--primary))",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* layer panel */}
        <div className="w-28 shrink-0 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1">Layers</p>
          {layersSorted.map((item) => {
            const src = thumbnailUrl(item) || null;
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragLayerId(item.id)}
                onDragEnd={() => setDragLayerId(null)}
                onDragOver={(e) => layerDragOver(e, item.id)}
                onClick={() => setSelectedId(prev => prev === item.id ? null : item.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 cursor-pointer transition-colors ${
                  isSelected ? "border-primary/60 bg-primary/10" : "border-border bg-card hover:bg-muted/40"
                } ${dragLayerId === item.id ? "opacity-40" : ""}`}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                <div className="w-7 h-7 shrink-0 bg-muted/40 rounded flex items-center justify-center overflow-hidden">
                  {src ? (
                    <img src={src} alt={item.category} className="w-full h-full object-contain" draggable={false} />
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

      {/* controls */}
      <div className="rounded-xl border bg-card p-3">
        {selectedItem ? (
          <p className="text-xs text-muted-foreground text-center">
            Drag to move · corner handles to scale · ○ handle to rotate
          </p>
        ) : (
          <p className="text-xs text-muted-foreground text-center">
            Tap an item to select
          </p>
        )}
        <button
          onClick={handleReset}
          className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to auto layout
        </button>
      </div>
    </div>
  );
}
