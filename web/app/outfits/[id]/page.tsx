"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getOutfit, updateOutfit, deleteOutfit, wearOutfit, imageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Outfit } from "@/lib/types";

const seasons = ["Spring", "Summer", "Fall", "Winter", "All Season"];
const vibes = [
  "Casual",
  "Formal",
  "Athletic",
  "Streetwear",
  "Vintage",
  "Minimalist",
  "Bold",
  "Bohemian",
];

export default function OutfitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [selectedVibes, setSelectedVibes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOutfit(id).then((o) => {
      setOutfit(o);
      setName(o.name);
      setSeason(o.season || "");
      setSelectedVibes(new Set(o.vibe || []));
    });
  }, [id]);

  const handleWear = async () => {
    try {
      const updated = await wearOutfit(id);
      setOutfit(updated);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVibe = (vibe: string) => {
    const next = new Set(selectedVibes);
    if (next.has(vibe)) {
      next.delete(vibe);
    } else {
      next.add(vibe);
    }
    setSelectedVibes(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateOutfit(id, {
        name,
        season: season || undefined,
        vibe: Array.from(selectedVibes),
      });
      setOutfit(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this outfit?")) return;
    await deleteOutfit(id);
    router.push("/outfits");
  };

  if (!outfit) {
    return (
      <div className="flex justify-center py-20">
        <span className="text-muted-foreground animate-pulse">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={handleWear}
              >
                ✓ Wear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Outfit Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Season</Label>
            <Select value={season} onValueChange={setSeason}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vibe Tags</Label>
            <div className="flex flex-wrap gap-2">
              {vibes.map((vibe) => (
                <Badge
                  key={vibe}
                  variant={selectedVibes.has(vibe) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => handleToggleVibe(vibe)}
                >
                  {vibe}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{outfit.name}</h1>
            <div className="mt-2 space-y-1">
              <p className="text-muted-foreground">
                Used {outfit.usage_count} time{outfit.usage_count !== 1 ? "s" : ""}
              </p>
              {outfit.last_worn && (
                <p className="text-sm text-muted-foreground">
                  Last worn {new Date(outfit.last_worn).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {outfit.season && (
            <div>
              <Label className="text-xs text-muted-foreground">Season</Label>
              <Badge className="mt-1">{outfit.season}</Badge>
            </div>
          )}

          {outfit.vibe && outfit.vibe.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Vibes</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {outfit.vibe.map((v) => (
                  <Badge key={v} variant="secondary">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Items</Label>
            {outfit.items && outfit.items.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                {outfit.items.map((item) => {
                  const src =
                    item.image_status === "done" && item.image_url
                      ? imageUrl(item.image_url)
                      : item.raw_image_url
                        ? imageUrl(item.raw_image_url)
                        : null;

                  return (
                    <div
                      key={item.id}
                      className="bg-muted rounded-lg aspect-square flex items-center justify-center overflow-hidden"
                    >
                      {src ? (
                        <img
                          src={src}
                          alt={item.category}
                          className="object-contain w-full h-full p-2"
                        />
                      ) : (
                        <span className="text-3xl">👕</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground mt-2">
                No items in this outfit
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
