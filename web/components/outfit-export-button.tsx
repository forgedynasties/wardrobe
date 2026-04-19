"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportOutfitImage } from "@/lib/export-outfit";
import type { ClothingItem, OutfitItem } from "@/lib/types";

interface Props {
  items: Array<ClothingItem | OutfitItem>;
  name?: string;
  variant?: "button" | "overlay";
  label?: string;
}

export function OutfitExportButton({
  items,
  name,
  variant = "button",
  label = "Export",
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy || items.length === 0) return;
    setBusy(true);
    try {
      await exportOutfitImage(items, { name });
    } catch (err) {
      console.error("export failed", err);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || items.length === 0}
        title="Export as image"
        aria-label="Export outfit as image"
        className="absolute top-1.5 right-1.5 z-10 h-7 w-7 rounded-full bg-background/80 backdrop-blur border flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-40 hover:bg-background"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={busy || items.length === 0}
      className="gap-1.5"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </Button>
  );
}
