"use client";

import { useCallback, useState } from "react";

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
      className={`border-2 border-dashed rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer transition-colors ${
        dragOver
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
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
        <span className="text-sm text-muted-foreground animate-pulse">
          Uploading...
        </span>
      ) : preview ? (
        <img
          src={preview}
          alt="Preview"
          className="object-contain w-full h-full p-4"
        />
      ) : (
        <div className="text-center p-4">
          <span className="text-4xl block mb-2">📷</span>
          <p className="text-sm text-muted-foreground">
            Drop image or tap to upload
          </p>
        </div>
      )}
    </div>
  );
}
