"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Check, Plus, X, Share2, LayoutTemplate } from "lucide-react";
import { getOutfit, updateOutfit, deleteOutfit, wearOutfit, addOutfitItem, removeOutfitItem, updateOutfitLayout, imageUrl, thumbnailUrl } from "@/lib/api";
import { outfitRefreshStore } from "@/lib/outfit-refresh";
import { FitBuilder } from "@/components/fit-builder";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { OutfitLayoutEditor } from "@/components/outfit-layout-editor";
import { OutfitExportButton } from "@/components/outfit-export-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useUser } from "@/lib/user-context";
import type { Outfit } from "@/lib/types";

export default function OutfitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const id = params.id as string;

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState(false);

  useEffect(() => {
    getOutfit(id).then((o) => {
      setOutfit(o);
      setName(o.name);
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateOutfit(id, { name });
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
      outfitRefreshStore.trigger();
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
                variant="ghost" size="sm"
                onClick={async () => {
                  if (!user) return;
                  const url = `${window.location.origin}/p/${user.username}/outfits/${id}`;
                  if (navigator.share) { try { await navigator.share({ url }); return; } catch {} }
                  await navigator.clipboard.writeText(url);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
              >
                {shareCopied ? <Check className="h-4 w-4 text-green-500" /> : <Share2 className="h-4 w-4" />}
              </Button>
              <OutfitExportButton items={outfit.items ?? []} name={outfit.name} />
              <Button variant="outline" size="sm" onClick={() => setEditingLayout(true)} className="gap-1.5" disabled={!outfit?.items?.length}>
                <LayoutTemplate className="h-3.5 w-3.5" />
                Layout
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-destructive hover:text-destructive">
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

          {outfit.items && outfit.items.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Remove items</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {outfit.items.map((item) => {
                  const src = thumbnailUrl(item) || null;
                  return (
                    <div key={item.id} className="relative">
                      <div className="bg-card rounded-lg aspect-square flex items-center justify-center overflow-hidden">
                        {src ? (
                          <img src={src} alt={item.category} className="object-contain w-full h-full p-2" />
                        ) : (
                          <span className="text-3xl text-muted-foreground/50">
                            {item.category === "Shoes" ? "👟" : "👕"}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removingItem === item.id}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{outfit.name}</h1>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{outfit.usage_count} {outfit.usage_count === 1 ? "wear" : "wears"}</span>
              {outfit.last_worn && (
                <>
                  <span>·</span>
                  <span>last worn {new Date(outfit.last_worn).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </>
              )}
            </div>
          </div>

          {editingLayout && outfit.items && outfit.items.length > 0 ? (
            <OutfitLayoutEditor
              items={outfit.items as import("@/lib/types").OutfitItem[]}
              onSave={async (layouts) => {
                const updated = await updateOutfitLayout(outfit.id, layouts);
                setOutfit(updated);
                setEditingLayout(false);
                outfitRefreshStore.trigger();
              }}
              onCancel={() => setEditingLayout(false)}
            />
          ) : outfit.items && outfit.items.length > 0 ? (
            <div className="aspect-[3/4] w-full max-w-sm mx-auto bg-muted/30 rounded-lg overflow-hidden relative">
              <OutfitCanvas items={outfit.items} />
            </div>
          ) : null}

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={handleWear}
          >
            <Check className="h-5 w-5" />
            Wear Today
          </Button>

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
                  const src = thumbnailUrl(item) || null;

                  return (
                    <div key={item.id} className="relative group">
                      <Link href={`/items/${item.id}`} className="block">
                        <div className="bg-card rounded-lg aspect-square flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
                          {src ? (
                            <img src={src} alt={item.category} className="object-contain w-full h-full p-2" />
                          ) : (
                            <span className="text-3xl text-muted-foreground/50">
                              {item.category === "Shoes" ? "👟" : "👕"}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium truncate mt-1 capitalize">
                          {item.name || item.sub_category || item.category}
                        </p>
                        {item.brand && (
                          <p className="text-[10px] text-muted-foreground truncate">{item.brand}</p>
                        )}
                      </Link>
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
