"use client";

import { useState } from "react";
import { X } from "lucide-react";
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
  values: string[];
  onChange: (hexes: string[]) => void;
}

export function ColorPicker({ values, onChange }: ColorPickerProps) {
  const [customHex, setCustomHex] = useState("#000000");
  const normalized = values.map((v) => v.toUpperCase());

  const toggle = (hex: string) => {
    const upper = hex.toUpperCase();
    if (normalized.includes(upper)) {
      onChange(values.filter((v) => v.toUpperCase() !== upper));
    } else {
      onChange([...values, hex]);
    }
  };

  const removeAt = (idx: number) => {
    onChange(values.filter((_, i) => i !== idx));
  };

  const addCustom = () => {
    if (!customHex || normalized.includes(customHex.toUpperCase())) return;
    onChange([...values, customHex]);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.hex}
            type="button"
            title={color.name}
            onClick={() => toggle(color.hex)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
              normalized.includes(color.hex.toUpperCase())
                ? "border-primary ring-2 ring-primary/30 scale-110"
                : "border-border",
              color.hex === "#FFFFFF" && "border-border",
            )}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((hex, idx) => {
            const preset = PRESET_COLORS.find((c) => c.hex.toUpperCase() === hex.toUpperCase());
            return (
              <span
                key={`${hex}-${idx}`}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-0.5 rounded-full bg-muted text-xs"
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-border"
                  style={{ backgroundColor: hex }}
                />
                <span className="font-mono">{preset?.name ?? hex}</span>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
        <Input
          value={customHex}
          onChange={(e) => setCustomHex(e.target.value)}
          placeholder="#000000"
          className="font-mono text-sm h-8 flex-1"
        />
        <button
          type="button"
          onClick={addCustom}
          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
        >
          Add
        </button>
      </div>
    </div>
  );
}
