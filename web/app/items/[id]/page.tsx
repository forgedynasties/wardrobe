"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getItem, updateItem, deleteItem, uploadImage, imageUrl } from "@/lib/api";
import { ImageUpload } from "@/components/image-upload";
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
import type { ClothingItem } from "@/lib/types";

const categories = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [colorHex, setColorHex] = useState("");
  const [material, setMaterial] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getItem(id).then((i) => {
      setItem(i);
      setCategory(i.category);
      setSubCategory(i.sub_category);
      setColorHex(i.color_hex);
      setMaterial(i.material);
    });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateItem(id, {
        category,
        sub_category: subCategory,
        color_hex: colorHex,
        material,
      });
      setItem(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this item?")) return;
    await deleteItem(id);
    router.push("/wardrobe");
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
      <div className="flex justify-center py-20">
        <span className="text-muted-foreground animate-pulse">Loading...</span>
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
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          Back
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={`${item.category} ${item.sub_category}`}
            className="object-contain w-full h-full p-4"
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
            <Select value={category} onValueChange={setCategory}>
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
            <Label>Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorHex || "#000000"}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <Input
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="font-mono"
              />
            </div>
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
          {item.color_hex && (
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full border border-border"
                style={{ backgroundColor: item.color_hex }}
              />
              <span className="text-sm font-mono">{item.color_hex}</span>
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
        </div>
      )}
    </div>
  );
}
