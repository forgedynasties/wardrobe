"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { addOutfitItem, createOutfit } from "@/lib/api";
import type { OutfitSuggestion } from "@/lib/types";

interface Props {
  suggestions: OutfitSuggestion[];
  onRefresh?: () => void;
}

export function OutfitSuggestions({ suggestions, onRefresh }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState<number | null>(null);

  if (suggestions.length === 0) return null;

  const handleSave = async (idx: number, suggestion: OutfitSuggestion) => {
    setSaving(idx);
    try {
      const outfit = await createOutfit({});
      for (const item of suggestion.items) {
        await addOutfitItem(outfit.id, item.id);
      }
      router.push(`/outfits/${outfit.id}`);
    } catch (err) {
      console.error(err);
      setSaving(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">New combos to try</h2>
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} className="text-xs h-7">
            Shuffle
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {suggestions.map((sug, idx) => (
          <Card key={idx} className="overflow-hidden">
            <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
              <OutfitCanvas items={sug.items} />
            </div>
            <div className="px-3 py-2.5 space-y-2">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {sug.reason}
              </Badge>
              <Button
                size="sm"
                className="w-full h-8 text-xs"
                onClick={() => handleSave(idx, sug)}
                disabled={saving !== null}
              >
                {saving === idx ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save outfit"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
