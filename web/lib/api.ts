import type {
  ClothingItem,
  Outfit,
  OutfitLog,
  OutfitRecommendation,
  OutfitSuggestion,
  LogOutfitWearRequest,
  CreateItemRequest,
  UpdateItemRequest,
  CreateOutfitRequest,
  UpdateOutfitRequest,
  OutfitItemLayout,
  ItemStats,
  WardrobeStats,
} from "./types";
import { getCurrentUser } from "./user-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const user = getCurrentUser();
  if (user) headers["X-User"] = user;

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  
  // Handle empty responses
  const contentLength = res.headers.get("content-length");
  if (contentLength === "0" || res.body === null) {
    return undefined as T;
  }
  
  try {
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse JSON response from", path, err);
    throw err;
  }
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
  const headers: Record<string, string> = {};
  const user = getCurrentUser();
  if (user) headers["X-User"] = user;
  const res = await fetch(`${API_BASE}/api/items/${id}/image`, {
    method: "POST",
    headers,
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

export function updateOutfitLayout(
  id: string,
  items: OutfitItemLayout[],
): Promise<Outfit> {
  return fetcher(`/api/outfits/${id}/layout`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export function wearOutfit(id: string): Promise<Outfit> {
  return fetcher(`/api/outfits/${id}/wear`, {
    method: "POST",
  });
}

export function getOutfitRecommendations(limit = 5): Promise<OutfitRecommendation[]> {
  return fetcher(`/api/outfits/recommendations?limit=${limit}`);
}

export function getOutfitSuggestions(count = 3): Promise<OutfitSuggestion[]> {
  return fetcher(`/api/outfits/suggestions?count=${count}`);
}

// Outfit Logs

export function logOutfitWear(data: LogOutfitWearRequest): Promise<OutfitLog> {
  return fetcher("/api/outfit-logs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getOutfitLogs(startDate: string, endDate: string): Promise<OutfitLog[]> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  return fetcher(`/api/outfit-logs?${params}`);
}

export function getOutfitLogByDate(date: string): Promise<OutfitLog> {
  return fetcher(`/api/outfit-logs/${date}`);
}

export function deleteOutfitLog(id: string): Promise<void> {
  return fetcher(`/api/outfit-logs/${id}`, { method: "DELETE" });
}

export function updateOutfitLog(
  id: string,
  data: { notes: string; item_ids: string[] },
): Promise<OutfitLog> {
  return fetcher(`/api/outfit-logs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Stats

export function getItemStats(id: string): Promise<ItemStats> {
  return fetcher(`/api/items/${id}/stats`);
}

export function getWardrobeStats(): Promise<WardrobeStats> {
  return fetcher(`/api/stats`);
}

export function imageUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Legacy rows pre-R2 stored /uploads/... — these files no longer exist but
  // we tolerate the shape so the UI doesn't crash.
  const cleanPath = path.startsWith("/uploads/") ? path.slice(9) : path;
  return `${API_BASE}/api/image/${cleanPath}`;
}

// Canvas-tainting workaround: when we need pixel access (e.g. PNG export),
// route image fetches through the backend so CORS headers are guaranteed.
export function proxiedImageUrl(url: string): string {
  if (!url) return "";
  const m = url.match(/\/(raw|clean)\/[^?#]+$/);
  if (!m) return url;
  return `${API_BASE}/api/image${m[0]}`;
}
