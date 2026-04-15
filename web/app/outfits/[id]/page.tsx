"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Check, Plus, X } from "lucide-react";
import { getOutfit, updateOutfit, deleteOutfit, wearOutfit, addOutfitItem, removeOutfitItem, imageUrl } from "@/lib/api";
import { FitBuilder } from "@/components/fit-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

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
    setDeleting(true);
    try {
      await deleteOutfit(id);
      router.push("/outfits");
    } catch {
      setDeleting(false);
    }
  };

  const handleAddItems = async (itemIds: string[]) => {
    const currentItemIds = new Set(outfit?.items?.map(i => i.id) || []);
    const newIds = itemIds.filter(iid => !currentItemIds.has(iid));
    for (const itemId of newIds) {
      await addOutfitItem(id, itemId);
    }
    const updated = await getOutfit(id);
    setOutfit(updated);
    setShowItemPicker(false);
  };

  const handleRemoveItem = async (itemId: string) => {
    setRemovingItem(itemId);
    try {
      await removeOutfitItem(id, itemId);
      const updated = await getOutfit(id);
      setOutfit(updated);
    } finally {
      setRemovingItem(null);
    }
  };

  if (!outfit) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <div className="grid grid-cols-3 gap-3 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/outfits")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Outfits
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
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
            <Select value={season} onValueChange={(v) => setSeason(v || "")}>
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

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={handleWear}
          >
            <Check className="h-5 w-5" />
            Wear Today
          </Button>

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
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Items ({outfit.items?.length || 0})</Label>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-7 text-xs"
                onClick={() => setShowItemPicker(true)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
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
                    <div key={item.id} className="relative group">
                      <Link
                        href={`/items/${item.id}`}
                        className="bg-muted/50 rounded-lg aspect-square flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all block"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={item.category}
                            className="object-contain w-full h-full p-2"
                          />
                        ) : (
                          <span className="text-3xl text-muted-foreground/50">
                            {item.category === "Shoes" ? "👟" : "👕"}
                          </span>
                        )}
                      </Link>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingItem === item.id}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
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

      <Sheet open={showItemPicker} onOpenChange={setShowItemPicker}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add items to outfit</SheetTitle>
            <SheetDescription>Select items to add</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">
            <FitBuilder
              onSelect={handleAddItems}
              initialItems={outfit.items || []}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete outfit</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{outfit.name}&rdquo;. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
