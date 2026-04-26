"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createItem, uploadImage } from "@/lib/api";
import { extractColorsFromImage } from "@/lib/colors";
import { ImageUpload } from "@/components/image-upload";
import { ColorPicker } from "@/components/color-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CATEGORIES as categories, SUB_CATEGORIES as subCategories } from "@/lib/categories";

export default function NewItemPage() {
  const router = useRouter();

  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [material, setMaterial] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (f: File) => {
    setFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreview(objectUrl);
    extractColorsFromImage(objectUrl, 5).then((extracted) => {
      if (extracted.length > 0) setColors(extracted);
    });
  };

  const handleSubmit = async () => {
    setAttempted(true);
    if (!category) return;
    setSaving(true);
    setError(null);
    try {
      const item = await createItem({
        category,
        sub_category: subCategory,
        colors,
        material,
      });
      if (file) {
        await uploadImage(item.id, file);
      }
      router.push(`/items/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/wardrobe")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Wardrobe
        </Button>
        <h1 className="text-2xl font-bold">Add Item</h1>
        <div className="w-20" />
      </div>

      <div className="space-y-5">
        <ImageUpload
          onFileSelect={handleFileSelect}
          preview={preview}
          uploading={saving}
        />

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={category}
            onValueChange={(v) => { if (v) { setCategory(v); setSubCategory(""); } }}
          >
            <SelectTrigger className={attempted && !category ? "border-destructive" : ""}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {attempted && !category && (
            <p className="text-xs text-destructive">Category is required</p>
          )}
        </div>

        {category && subCategories[category] && (
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={subCategory} onValueChange={(v) => v && setSubCategory(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {subCategories[category].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>Colors</Label>
          <ColorPicker values={colors} onChange={setColors} />
        </div>

        <div className="space-y-2">
          <Label>Material</Label>
          <Input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="Cotton, Polyester, etc."
          />
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/50 text-destructive px-3 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handleSubmit}
          disabled={!category || saving}
        >
          {saving ? "Saving..." : "Add to Wardrobe"}
        </Button>
      </div>
    </div>
  );
}
