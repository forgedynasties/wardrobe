"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const PRESET_COLORS = [
  { hex: "#000000", name: "Black" },
  { hex: "#FFFFFF", name: "White" },
  { hex: "#6B7280", name: "Gray" },
  { hex: "#1E3A5F", name: "Navy" },
  { hex: "#3B82F6", name: "Blue" },
  { hex: "#06B6D4", name: "Cyan" },
  { hex: "#10B981", name: "Green" },
  { hex: "#84CC16", name: "Lime" },
  { hex: "#EAB308", name: "Yellow" },
  { hex: "#F97316", name: "Orange" },
  { hex: "#EF4444", name: "Red" },
  { hex: "#EC4899", name: "Pink" },
  { hex: "#A855F7", name: "Purple" },
  { hex: "#78350F", name: "Brown" },
  { hex: "#D4B896", name: "Beige" },
  { hex: "#F5F0EB", name: "Cream" },
];

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);
  const normalizedValue = value.toUpperCase();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            title={color.name}
            onClick={() => { onChange(color.hex); setShowCustom(false); }}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
              normalizedValue === color.hex.toUpperCase()
                ? "border-primary ring-2 ring-primary/30 scale-110"
                : "border-border",
              color.hex === "#FFFFFF" && "border-border",
            )}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCustom(!showCustom)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showCustom ? "Hide" : "Custom color"}
        </button>
        {(showCustom || !PRESET_COLORS.some(c => c.hex.toUpperCase() === normalizedValue)) && (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="color"
              value={value || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className="font-mono text-sm h-8"
            />
          </div>
        )}
        {!showCustom && PRESET_COLORS.some(c => c.hex.toUpperCase() === normalizedValue) && (
          <span className="text-xs text-muted-foreground">
            {PRESET_COLORS.find(c => c.hex.toUpperCase() === normalizedValue)?.name}
          </span>
        )}
      </div>
    </div>
  );
}
