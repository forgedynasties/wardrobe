"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
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

  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [productUrl, setProductUrl] = useState("");
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
    extractColorsFromImage(objectUrl).then((extracted) => {
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
        name,
        brand,
        product_url: productUrl,
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
          Hangur
        </Button>
        <h1 className="text-2xl font-bold">Add Item</h1>
        <div className="w-20" />
      </div>

      <Link
        href="/image-guide"
        className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 mb-5 hover:bg-muted/40 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Adding clothes with AI</p>
            <p className="text-xs text-muted-foreground">Use Gemini + remove.bg to prep your images</p>
          </div>
        </div>
        <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      <div className="space-y-5">
        <ImageUpload
          onFileSelect={handleFileSelect}
          preview={preview}
          uploading={saving}
        />

        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vintage Levi's jacket"
          />
        </div>

        <div className="space-y-2">
          <Label>Brand</Label>
          <Input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="e.g. Khushposh, Asphalt Attire, Nike"
          />
        </div>

        <div className="space-y-2">
          <Label>Product link <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>

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
          {saving ? "Saving..." : "Add to Hangur"}
        </Button>
      </div>
    </div>
  );
}
