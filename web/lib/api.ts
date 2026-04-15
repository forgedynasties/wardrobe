import type {
  ClothingItem,
  Outfit,
  CreateItemRequest,
  UpdateItemRequest,
  CreateOutfitRequest,
  UpdateOutfitRequest,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Items

export function getItems(): Promise<ClothingItem[]> {
  return fetcher("/api/items");
}

export function getItem(id: string): Promise<ClothingItem> {
  return fetcher(`/api/items/${id}`);
}

export function createItem(data: CreateItemRequest): Promise<ClothingItem> {
  return fetcher("/api/items", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateItem(
  id: string,
  data: UpdateItemRequest,
): Promise<ClothingItem> {
  return fetcher(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteItem(id: string): Promise<void> {
  return fetcher(`/api/items/${id}`, { method: "DELETE" });
}

export async function uploadImage(
  id: string,
  file: File,
): Promise<{ status: string; raw_image_url: string }> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/api/items/${id}/image`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed ${res.status}`);
  }
  return res.json();
}

// Outfits

export function getOutfits(): Promise<Outfit[]> {
  return fetcher("/api/outfits");
}

export function getOutfit(id: string): Promise<Outfit> {
  return fetcher(`/api/outfits/${id}`);
}

export function createOutfit(data: CreateOutfitRequest): Promise<Outfit> {
  return fetcher("/api/outfits", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateOutfit(
  id: string,
  data: UpdateOutfitRequest,
): Promise<Outfit> {
  return fetcher(`/api/outfits/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteOutfit(id: string): Promise<void> {
  return fetcher(`/api/outfits/${id}`, { method: "DELETE" });
}

export function addOutfitItem(
  outfitId: string,
  itemId: string,
): Promise<{ status: string }> {
  return fetcher(`/api/outfits/${outfitId}/items`, {
    method: "POST",
    body: JSON.stringify({ clothing_item_id: itemId }),
  });
}

export function removeOutfitItem(
  outfitId: string,
  itemId: string,
): Promise<void> {
  return fetcher(`/api/outfits/${outfitId}/items/${itemId}`, {
    method: "DELETE",
  });
}

export function wearOutfit(id: string): Promise<Outfit> {
  return fetcher(`/api/outfits/${id}/wear`, {
    method: "POST",
  });
}

export function imageUrl(path: string): string {
  if (!path) return "";
  return `${API_BASE}${path}`;
}
