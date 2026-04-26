import { imageUrl, proxiedImageUrl } from "@/lib/api";
import { outfitConfig } from "@/lib/outfit-config";
import type { ClothingItem, OutfitItem } from "@/lib/types";

const CANVAS_W = 1080;
const CANVAS_H = 1440;

type Item = ClothingItem | OutfitItem;

function isOutfitItem(i: Item): i is OutfitItem {
  return "position_x" in i;
}

function hasCustomLayout(items: Item[]): boolean {
  return items.some((i) => isOutfitItem(i) && (i.position_x !== 0 || i.position_y !== 0));
}

function itemSrc(item: Item): string | null {
  // Always proxy through backend to avoid R2 CORS restriction on canvas fetch.
  if (item.image_status === "done" && item.image_url) return proxiedImageUrl(imageUrl(item.image_url));
  if (item.raw_image_url) return proxiedImageUrl(imageUrl(item.raw_image_url));
  return null;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  // Fetch with credentials so auth cookies are sent, then blob → ObjectURL to avoid
  // cross-origin canvas taint that would result from img.crossOrigin = "anonymous".
  const res = await fetch(src, { credentials: "include" });
  if (!res.ok) throw new Error(`failed to load ${src}: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(objectUrl); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(`failed to decode ${src}`)); };
    img.src = objectUrl;
  });
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const ratio = Math.min(w / iw, h / ih);
  const dw = iw * ratio;
  const dh = ih * ratio;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "outfit";
}

function getUiCanvasBackground(ctx: CanvasRenderingContext2D): string {
  if (typeof document === "undefined") return "#f3f1ee";

  const probe = document.createElement("div");
  probe.className = "bg-muted/30";
  probe.style.position = "fixed";
  probe.style.pointerEvents = "none";
  probe.style.opacity = "0";
  document.body.appendChild(probe);

  const backgroundColor = window.getComputedStyle(probe).backgroundColor;
  probe.remove();

  return backgroundColor || ctx.canvas.ownerDocument?.defaultView?.getComputedStyle(document.body).backgroundColor || "#f3f1ee";
}

export async function exportOutfitImage(
  items: Item[],
  opts?: { name?: string; filename?: string },
): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");

  ctx.fillStyle = getUiCanvasBackground(ctx);
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cfg = outfitConfig.get();
  const useCustom = hasCustomLayout(items);

  const slotZIndex = (item: Item) => {
    const sub = item.sub_category ? cfg.subcategorySlots[item.sub_category]?.zIndex : undefined;
    return sub ?? cfg.mannequinSlots[item.category]?.zIndex ?? 1;
  };
  const effectiveZ = (item: Item) =>
    isOutfitItem(item) && item.z_index !== 0 ? item.z_index : slotZIndex(item);

  const sorted = [...items].sort((a, b) =>
    useCustom
      ? effectiveZ(a) - effectiveZ(b)
      : slotZIndex(a) - slotZIndex(b),
  );

  const imgs = await Promise.all(
    sorted.map(async (it) => {
      const src = itemSrc(it);
      if (!src) return null;
      try {
        return await loadImage(src);
      } catch {
        return null;
      }
    }),
  );

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const img = imgs[i];
    if (!img) continue;
    const displayScale = item.display_scale || 1;

    if (useCustom) {
      // Mirror OutfitCanvas custom mode: scale(item.scale * display_scale)
      const itemScale = isOutfitItem(item) ? (item.scale ?? 1) : 1;
      const effectiveScale = itemScale * displayScale;
      const layout = isOutfitItem(item)
        ? { position_x: item.position_x, position_y: item.position_y }
        : { position_x: 0, position_y: 0 };
      const dw = CANVAS_W * effectiveScale;
      const dh = CANVAS_H * effectiveScale;
      const x = (layout.position_x / 100) * CANVAS_W + (CANVAS_W - dw) / 2;
      const y = (layout.position_y / 100) * CANVAS_H + (CANVAS_H - dh) / 2;
      drawContain(ctx, img, x, y, dw, dh);
    } else {
      // Mirror OutfitCanvas mannequin mode: scale(display_scale) applied to slot
      const subSlot = item.sub_category
        ? cfg.subcategorySlots[item.sub_category]
        : undefined;
      const slot =
        subSlot ?? cfg.mannequinSlots[item.category] ?? { top: 20, height: 40, zIndex: 1 };
      const width = slot.width ?? 80;
      const left = slot.left ?? (100 - width) / 2;
      const baseW = (width / 100) * CANVAS_W;
      const baseH = (slot.height / 100) * CANVAS_H;
      const x0 = (left / 100) * CANVAS_W;
      const y0 = (slot.top / 100) * CANVAS_H;
      const dw = baseW * displayScale;
      const dh = baseH * displayScale;
      drawContain(ctx, img, x0 + (baseW - dw) / 2, y0 + (baseH - dh) / 2, dw, dh);
    }
  }

  if (opts?.name) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#111";
    ctx.font = "600 32px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(opts.name, 32, 32);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#111";
  ctx.font = "600 30px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("wardrobe", CANVAS_W - 32, CANVAS_H - 28);
  ctx.restore();

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts?.filename ?? `${slugify(opts?.name ?? "outfit")}-wardrobe.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
