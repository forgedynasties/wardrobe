"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createItem, uploadImage } from "@/lib/api";
import { ImageUpload } from "@/components/image-upload";
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

const categories = ["Top", "Bottom", "Outerwear", "Shoes", "Accessory"];
const subCategories: Record<string, string[]> = {
  Top: ["T-Shirt", "Hoodie", "Shirt", "Sweater", "Jacket", "Tank"],
  Bottom: ["Jeans", "Chinos", "Shorts", "Joggers", "Trousers"],
  Outerwear: ["Coat", "Bomber", "Parka", "Windbreaker", "Vest"],
  Shoes: ["Sneakers", "Boots", "Sandals", "Loafers", "Running"],
  Accessory: ["Hat", "Belt", "Watch", "Bag", "Scarf", "Glasses"],
};

export default function NewItemPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [material, setMaterial] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!category) return;
    setSaving(true);
    try {
      const item = await createItem({
        category,
        sub_category: subCategory,
        color_hex: colorHex,
        material,
      });
      if (file) {
        await uploadImage(item.id, file);
      }
      router.push(`/items/${item.id}`);
    } catch (err) {
      console.error(err);
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

      <div className="space-y-4">
        <ImageUpload
          onFileSelect={handleFileSelect}
          preview={preview}
          uploading={saving}
        />

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => { setCategory(v); setSubCategory(""); }}>
            <SelectTrigger>
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
        </div>

        {category && subCategories[category] && (
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={subCategory} onValueChange={setSubCategory}>
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
          <Label>Color</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border-0"
            />
            <Input
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              placeholder="#000000"
              className="font-mono"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Material</Label>
          <Input
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            placeholder="Cotton, Polyester, etc."
          />
        </div>

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!category || saving}
        >
          {saving ? "Saving..." : "Add to Wardrobe"}
        </Button>
      </div>
    </div>
  );
}
