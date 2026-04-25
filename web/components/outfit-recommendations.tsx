"use client";

import { memo } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { OutfitExportButton } from "@/components/outfit-export-button";
import type { OutfitRecommendation } from "@/lib/types";

interface Props {
  recommendations: OutfitRecommendation[];
}

export const OutfitRecommendations = memo(function OutfitRecommendations({ recommendations }: Props) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Recommended for you</h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {recommendations.map((rec) => (
          <Link key={rec.id} href={`/outfits/${rec.id}`}>
            <Card className="overflow-hidden group hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer">
              <div className="aspect-[3/4] bg-muted/30 relative overflow-hidden">
                <OutfitCanvas items={rec.items ?? []} />
                <OutfitExportButton
                  items={rec.items ?? []}
                  name={rec.name}
                  variant="overlay"
                />
              </div>
              <div className="px-3 py-2.5 space-y-1.5">
                <h3 className="font-semibold text-sm truncate">{rec.name}</h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {rec.reason}
                </Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
});
