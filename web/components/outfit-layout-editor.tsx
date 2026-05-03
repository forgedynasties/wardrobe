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

// Canvas aspect ratio (matches aspect-[3/4] class)
const CANVAS_ASPECT = 3 / 4;

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

// Natural dimensions per item id, populated on image load
type NaturalDims = Map<string, { w: number; h: number }>;

// Compute the object-contain bounding box (in px) for an image inside a container.
// Returns { left, top, width, height } relative to the container top-left.
function containBox(
  containerW: number,
  containerH: number,
  imgW: number,
  imgH: number
): { left: number; top: number; width: number; height: number } {
  const scale = Math.min(containerW / imgW, containerH / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { left: (containerW - w) / 2, top: (containerH - h) / 2, width: w, height: h };
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

  // Handle drag state for transform handles
  const handleDragRef = useRef<{
    type: "scale" | "rotate";
    itemId: string;
    origScale: number;
    origRotation: number;
    // center of item in client coords at drag start
    centerX: number;
    centerY: number;
    // distance/angle from center at drag start
    origDist: number;
    origAngle: number;
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

  const canvasSorted = [...items].sort((a, b) => {
    const az = layouts.get(a.id)?.z_index ?? 0;
    const bz = layouts.get(b.id)?.z_index ?? 0;
    return az - bz;
  });

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
    if (dragRef.current && !dragRef.current.hasMoved) {
      const clickedId = dragRef.current.itemId;
      setSelectedId(prev => (prev === clickedId ? null : clickedId));
    }
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (activePointers.current.size === 0) dragRef.current = null;
  };

  // Handle pointer events for bounding box handles
  const handleHandlePointerDown = (
    e: React.PointerEvent,
    type: "scale" | "rotate",
    itemId: string
  ) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    const layout = layouts.get(itemId);
    if (!canvas || !layout) return;

    const rect = canvas.getBoundingClientRect();
    // Item center in client coords
    const centerX = rect.left + rect.width * (0.5 + layout.position_x / 100);
    const centerY = rect.top + rect.height * (0.5 + layout.position_y / 100);

    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    handleDragRef.current = {
      type,
      itemId,
      origScale: layout.scale,
      origRotation: layout.rotation,
      centerX,
      centerY,
      origDist: Math.hypot(dx, dy),
      origAngle: Math.atan2(dy, dx),
    };
  };

  const handleHandlePointerMove = (e: React.PointerEvent) => {
    const h = handleDragRef.current;
    if (!h) return;
    e.stopPropagation();

    const dx = e.clientX - h.centerX;
    const dy = e.clientY - h.centerY;

    if (h.type === "scale") {
      const newDist = Math.hypot(dx, dy);
      if (h.origDist > 1) {
        const ratio = newDist / h.origDist;
        updateLayout(h.itemId, { scale: clamp(h.origScale * ratio, 0.05, 4.0) });
      }
    } else {
      const angle = Math.atan2(dy, dx);
      const delta = angle - h.origAngle;
      const deg = h.origRotation + (delta * 180) / Math.PI;
      updateLayout(h.itemId, { rotation: deg });
    }
  };

  const handleHandlePointerUp = () => {
    handleDragRef.current = null;
  };

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
      const updates: OutfitItemLayoutUpdate[] = items.map(item => {
        const l = layouts.get(item.id) ?? { position_x: 0, position_y: 0, scale: 1, z_index: 0, rotation: 0 };
        return { item_id: item.id, ...l };
      });
      await onSave(updates);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = items.find(i => i.id === selectedId);
  const selectedLayout = selectedId ? layouts.get(selectedId) : null;

  // Compute bounding box overlay dimensions for the selected item.
  // The item div is `absolute inset-0` (fills canvas), so the image is object-contain inside it.
  // We compute the contain rect, then apply scale, and produce a centered overlay.
  function getBoundingBoxStyle(
    item: OutfitItem,
    layout: ItemLayout
  ): React.CSSProperties | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const dims = naturalDims.get(item.id);
    if (!dims) return null;

    const canvasW = canvas.clientWidth;
    const canvasH = canvas.clientHeight;
    const effectiveScale = layout.scale * (item.display_scale || 1);

    // The item's absolute inset-0 div is canvasW × canvasH.
    // object-contain rect within that:
    const box = containBox(canvasW, canvasH, dims.w, dims.h);

    // After CSS scale(effectiveScale) applied at center of the inset-0 div:
    const scaledW = box.width * effectiveScale;
    const scaledH = box.height * effectiveScale;

    // Center of item (in canvas coords, accounting for translation):
    const cx = canvasW / 2 + (layout.position_x / 100) * canvasW;
    const cy = canvasH / 2 + (layout.position_y / 100) * canvasH;

    return {
      position: "absolute",
      left: cx - scaledW / 2,
      top: cy - scaledH / 2,
      width: scaledW,
      height: scaledH,
      transform: `rotate(${layout.rotation}deg)`,
      transformOrigin: "center",
      pointerEvents: "none",
      zIndex: 9999,
    };
  }

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
            onPointerMove={(e) => {
              handlePointerMove(e);
              handleHandlePointerMove(e);
            }}
            onPointerUp={(e) => {
              handlePointerUp(e);
              handleHandlePointerUp();
            }}
            onPointerCancel={(e) => {
              handlePointerUp(e);
              handleHandlePointerUp();
            }}
          >
            {canvasSorted.map((item) => {
              const src = thumbnailUrl(item) || null;
              const layout = layouts.get(item.id) ?? { position_x: 0, position_y: 0, scale: 1, z_index: 0, rotation: 0 };
              const isSelected = selectedId === item.id;
              const effectiveScale = layout.scale * (item.display_scale || 1);

              return (
                // Outer div: absolute inset-0 for translate (% is relative to this div size = canvas size)
                <div
                  key={item.id}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${layout.position_x}%, ${layout.position_y}%)`,
                    zIndex: layout.z_index + 1,
                    cursor: "grab",
                  }}
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                >
                  {/* Inner div: scale + rotate around item center */}
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      transform: `scale(${effectiveScale}) rotate(${layout.rotation}deg)`,
                    }}
                  >
                    {src ? (
                      <>
                        <ShimmerImg
                          src={src}
                          alt={item.category}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                        {/* invisible img to capture natural dimensions */}
                        {!naturalDims.has(item.id) && (
                          <img
                            src={src}
                            alt=""
                            aria-hidden
                            className="absolute w-0 h-0 opacity-0 pointer-events-none"
                            onLoad={(e) => {
                              const img = e.currentTarget as HTMLImageElement;
                              setNaturalDims(prev => {
                                const next = new Map(prev);
                                next.set(item.id, { w: img.naturalWidth, h: img.naturalHeight });
                                return next;
                              });
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <span className="text-4xl pointer-events-none">👕</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bounding box overlay for selected item */}
            {selectedItem && selectedLayout && (() => {
              const boxStyle = getBoundingBoxStyle(selectedItem, selectedLayout);
              if (!boxStyle) return null;

              const HANDLE_SIZE = 14;
              const ROTATE_OFFSET = 28;

              return (
                <div style={boxStyle}>
                  {/* border */}
                  <div
                    className="absolute inset-0 rounded-sm"
                    style={{
                      border: "2px solid hsl(var(--primary))",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Corner scale handles */}
                  {[
                    { corner: "tl", cursor: "nw-resize", style: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 } },
                    { corner: "tr", cursor: "ne-resize", style: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 } },
                    { corner: "bl", cursor: "sw-resize", style: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 } },
                    { corner: "br", cursor: "se-resize", style: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 } },
                  ].map(({ corner, cursor, style }) => (
                    <div
                      key={corner}
                      className="absolute bg-background border-2 border-primary rounded-sm"
                      style={{
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        cursor,
                        pointerEvents: "all",
                        ...style,
                      }}
                      onPointerDown={(e) => handleHandlePointerDown(e, "scale", selectedItem.id)}
                    />
                  ))}

                  {/* Rotation handle — above center top */}
                  <div
                    className="absolute"
                    style={{
                      left: "50%",
                      top: -ROTATE_OFFSET - HANDLE_SIZE / 2,
                      transform: "translateX(-50%)",
                      pointerEvents: "all",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0,
                    }}
                    onPointerDown={(e) => handleHandlePointerDown(e, "rotate", selectedItem.id)}
                  >
                    {/* stem */}
                    <div
                      style={{
                        width: 2,
                        height: ROTATE_OFFSET - HANDLE_SIZE / 2,
                        background: "hsl(var(--primary))",
                        pointerEvents: "none",
                      }}
                    />
                    {/* circle */}
                    <div
                      className="bg-background border-2 border-primary rounded-full"
                      style={{
                        width: HANDLE_SIZE,
                        height: HANDLE_SIZE,
                        cursor: "crosshair",
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
                onDragOver={(e) => layerDragOver(e, item.id)}
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

      {/* controls */}
      <div className="rounded-xl border bg-card p-3 space-y-3">
        {!selectedItem && (
          <p className="text-xs text-muted-foreground text-center">
            Click an item to select · drag to move · corner handles to scale · top handle to rotate
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
