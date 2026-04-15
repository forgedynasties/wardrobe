"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";

interface ImageUploadProps {
  onFileSelect: (file: File) => void;
  preview?: string | null;
  uploading?: boolean;
}

export function ImageUpload({
  onFileSelect,
  preview,
  uploading,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type.startsWith("image/")) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  return (
    <div
      className={`border-2 border-dashed rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
        dragOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) handleFile(file);
        };
        input.click();
      }}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Uploading...</span>
        </div>
      ) : preview ? (
        <img
          src={preview}
          alt="Preview"
          className="object-contain w-full h-full p-4 rounded-xl"
        />
      ) : (
        <div className="text-center p-6">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">Drop image or tap to upload</p>
          <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
        </div>
      )}
    </div>
  );
}
