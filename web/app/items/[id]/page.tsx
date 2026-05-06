"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Trash2, Pencil, ArrowLeft, Share2, Check, ExternalLink } from "lucide-react";
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
import { useUser } from "@/lib/user-context";
import type { ClothingItem, ItemStats } from "@/lib/types";
import { CATEGORIES as categories, SUB_CATEGORIES as subCategories } from "@/lib/categories";

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const id = params.id as string;

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [stats, setStats] = useState<ItemStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [productUrl, setProductUrl] = useState("");
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
      setName(i.name ?? "");
      setBrand(i.brand ?? "");
      setProductUrl(i.product_url ?? "");
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
        name,
        brand,
        product_url: productUrl,
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
      router.push("/");
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
  const imageStatusLabel = item.image_status === "processing" ? "done" : item.image_status;

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/wardrobe")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Wardrobe
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <>
              <Button
                variant="ghost" size="sm"
                onClick={async () => {
                  if (!user) return;
                  const url = `${window.location.origin}/p/${user.username}/items/${id}`;
                  if (navigator.share) { try { await navigator.share({ url }); return; } catch {} }
                  await navigator.clipboard.writeText(url);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
              >
                {shareCopied ? <Check className="h-4 w-4 text-foreground" /> : <Share2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            </>
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
      </div>


      {!imgSrc && (
        <p className="text-sm text-muted-foreground mb-4">
          No image yet. Tap above to upload.
        </p>
      )}

      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vintage Levi's jacket" />
          </div>

          <div className="space-y-2">
            <Label>Brand</Label>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Levi's, Nike, Zara" />
          </div>

          <div className="space-y-2">
            <Label>Product link <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
            <Input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://..." />
          </div>

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
            <Select
              value={subCategory}
              onValueChange={(v) => v && setSubCategory(v)}
              disabled={!category || !subCategories[category]}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {(subCategories[category] ?? []).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {item.name && <h2 className="text-lg font-semibold">{item.name}</h2>}
          {item.brand && <p className="text-sm text-muted-foreground">{item.brand}</p>}
          {item.product_url && (
            <a
              href={item.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              View product
            </a>
          )}
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
              This will permanently remove this {item.category.toLowerCase()} from your hangur. This action cannot be undone.
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
