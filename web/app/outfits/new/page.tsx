"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { createOutfit, addOutfitItem } from "@/lib/api";
import { FitBuilder } from "@/components/fit-builder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { randomOutfitName } from "@/lib/outfit-names";

export default function NewOutfitPage() {
  const router = useRouter();
  const [name, setName] = useState(() => randomOutfitName());
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  const handleItemsSelected = (itemIds: string[]) => {
    setSelectedItems(itemIds);
    setShowBuilder(false);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const outfit = await createOutfit({
        name: name.trim() || randomOutfitName(),
      });

      // Add selected items to the outfit
      for (const itemId of selectedItems) {
        await addOutfitItem(outfit.id, itemId);
      }

      router.push(`/outfits/${outfit.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/outfits")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Outfits
        </Button>
        <h1 className="text-2xl font-bold">Create Outfit</h1>
        <div className="w-20" />
      </div>

      <div className="space-y-6">
        {/* Outfit Details */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Outfit Name</Label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setName(randomOutfitName())}
                title="Regenerate name"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Item Selection */}
        <div className="border-t pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Items ({selectedItems.length})</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBuilder(!showBuilder)}
            >
              {showBuilder ? "Done" : "Add Items"}
            </Button>
          </div>

          {showBuilder ? (
            <FitBuilder onSelect={handleItemsSelected} />
          ) : selectedItems.length > 0 ? (
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setShowBuilder(true)}
              >
                Modify
              </Button>
            </div>
          ) : (
            <div className="bg-muted/30 p-4 rounded-lg text-center text-muted-foreground">
              <p className="text-sm">No items added yet</p>
            </div>
          )}
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Creating..." : "Create Outfit"}
        </Button>
      </div>
    </div>
  );
}
