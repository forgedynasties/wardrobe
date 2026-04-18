"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Pencil, ArrowLeft } from "lucide-react";
import { getItem, updateItem, deleteItem, uploadImage, imageUrl, getItemStats } from "@/lib/api";
import { ImageUpload } from "@/components/image-upload";
import { ColorPicker } from "@/components/color-picker";
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
import type { ClothingItem, ItemStats } from "@/lib/types";

const categories = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [stats, setStats] = useState<ItemStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [material, setMaterial] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getItem(id).then((i) => {
      setItem(i);
      setCategory(i.category);
      setSubCategory(i.sub_category);
      setColors(i.colors ?? []);
      setMaterial(i.material);
    });
    getItemStats(id).then((s) => {
      setStats(s);
    }).catch((err) => {
      console.error("Failed to load stats:", err);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateItem(id, {
        category,
        sub_category: subCategory,
        colors,
        material,
      });
      setItem(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteItem(id);
      router.push("/wardrobe");
    } catch {
      setDeleting(false);
    }
  };

  const handleReupload = async (file: File) => {
    setSaving(true);
    try {
      await uploadImage(id, file);
      const updated = await getItem(id);
      setItem(updated);
    } finally {
      setSaving(false);
    }
  };

  if (!item) {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="aspect-square w-full rounded-lg" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    );
  }

  const imgSrc = showRaw
    ? item.raw_image_url
      ? imageUrl(item.raw_image_url)
      : null
    : item.image_url
      ? imageUrl(item.image_url)
      : item.raw_image_url
        ? imageUrl(item.raw_image_url)
        : null;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/wardrobe")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Wardrobe
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="aspect-square bg-card rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${item.category} ${item.sub_category}`}
            className="object-contain w-full h-full"
            style={{ transform: `scale(${item.display_scale || 1})` }}
          />
        ) : (
          <ImageUpload onFileSelect={handleReupload} uploading={saving} />
        )}
        {item.image_status === "processing" && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="animate-pulse">Processing...</span>
          </div>
        )}
      </div>

      {item.image_url && item.raw_image_url && (
        <div className="flex gap-2 mb-4">
          <Badge
            variant={!showRaw ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setShowRaw(false)}
          >
            Clean
          </Badge>
          <Badge
            variant={showRaw ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setShowRaw(true)}
          >
            Raw
          </Badge>
          <Badge variant="secondary">{item.image_status}</Badge>
        </div>
      )}

      {!imgSrc && (
        <p className="text-sm text-muted-foreground mb-4">
          No image yet. Tap above to upload.
        </p>
      )}

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Input
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Colors</Label>
            <ColorPicker values={colors} onChange={setColors} />
          </div>

          <div className="space-y-2">
            <Label>Material</Label>
            <Input
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge>{item.category}</Badge>
            {item.sub_category && (
              <span className="text-sm text-muted-foreground">
                {item.sub_category}
              </span>
            )}
          </div>
          {item.colors && item.colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {item.colors.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="w-5 h-5 rounded-full border border-border"
                    style={{ backgroundColor: c }}
                  />
                  <span className="text-sm font-mono">{c}</span>
                </div>
              ))}
            </div>
          )}
          {item.material && (
            <p className="text-sm text-muted-foreground">{item.material}</p>
          )}
          {item.last_worn && (
            <p className="text-xs text-muted-foreground">
              Last worn: {new Date(item.last_worn).toLocaleDateString()}
            </p>
          )}
          {stats && (
            <div className="mt-4 pt-4 border-t space-y-3">
              <h3 className="font-semibold text-sm">Stats</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="text-2xl font-bold">{stats.outfit_count}</p>
                  <p className="text-xs text-muted-foreground">Outfits</p>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="text-2xl font-bold">{stats.wear_count}</p>
                  <p className="text-xs text-muted-foreground">Times Worn</p>
                </div>
                <div className="bg-muted/50 rounded p-3 text-center">
                  <p className="text-2xl font-bold">{item.last_worn ? "Yes" : "No"}</p>
                  <p className="text-xs text-muted-foreground">Worn</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>
              This will permanently remove this {item.category.toLowerCase()} from your wardrobe. This action cannot be undone.
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
