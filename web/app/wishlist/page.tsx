"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Heart, Trash2 } from "lucide-react";
import { createWishlistItem, deleteWishlistItem, getWishlistItems } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@/lib/user-context";
import type { WishlistItem } from "@/lib/types";

function formatPkr(value: number) {
  return `PKR ${value}`;
}

export default function WishlistPage() {
  const { user, hydrated } = useUser();
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    getWishlistItems()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load wishlist"));
  }, [hydrated, user]);

  const orderedItems = [...(items ?? [])].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
  );

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    setError(null);
    if (!name.trim() || !link.trim() || !price.trim()) {
      setError("Name, link, and price are required.");
      return;
    }

    setSaving(true);
    try {
      const created = await createWishlistItem({
        name: name.trim(),
        image_url: image.trim(),
        product_url: link.trim(),
        price_pkr: Number(price),
      });
      setItems((prev) => [created, ...(prev ?? [])]);
      setName("");
      setImage("");
      setLink("");
      setPrice("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wishlist item");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteWishlistItem(id);
      setItems((prev) => (prev ?? []).filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove wishlist item");
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Wishlist</h1>
        <p className="text-muted-foreground">Save pieces you want to buy later with image, link, and PKR price.</p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Item name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vintage leather jacket"
            />
          </div>

          <div className="space-y-2">
            <Label>Price (PKR)</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
              placeholder="2500"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Product link</Label>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Item image</Label>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Paste image URL or upload below"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleImageUpload(file);
                  };
                  input.click();
                }}
              >
                Upload image
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Button onClick={handleAdd} disabled={saving}>
          {saving ? "Saving..." : "Add to Wishlist"}
        </Button>
      </Card>

      {items === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-8 w-28 mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : orderedItems.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <Heart className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="font-medium">No wishlist items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add dream pieces here and keep the shopping link handy.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orderedItems.map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Heart className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="p-4 flex-1 space-y-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatPkr(item.price_pkr)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => window.open(item.product_url, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open link
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
