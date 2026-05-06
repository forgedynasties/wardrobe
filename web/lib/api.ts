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
  OutfitItemLayoutUpdate,
  ItemStats,
  HangurStats,
  WishlistItem,
  CreateWishlistItemRequest,
  Page,
  HeatmapEntry,
  PublicProfile,
  LeaderboardEntry,
} from "./types";
// Empty string = same-origin (uses Next.js rewrites → no cross-site cookie issues on Safari).
// Set NEXT_PUBLIC_API_URL only to override (e.g. direct backend in dev without rewrites).
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${body.error || `API error ${res.status}`} — ${path}`);
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

// Admin
export function adminListUsers(): Promise<import("./user-context").AuthUser[]> {
  return fetcher("/api/admin/users");
}

export function adminResetPassword(username: string, newPassword: string): Promise<void> {
  return fetcher(`/api/admin/users/${username}/password`, {
    method: "PUT",
    body: JSON.stringify({ new_password: newPassword }),
  });
}

export function adminSetUserActive(username: string, active: boolean): Promise<void> {
  return fetcher(`/api/admin/users/${username}/active`, {
    method: "PUT",
    body: JSON.stringify({ active }),
  });
}

export function adminSetUserAdmin(username: string, admin: boolean): Promise<void> {
  return fetcher(`/api/admin/users/${username}/admin`, {
    method: "PUT",
    body: JSON.stringify({ admin }),
  });
}

export function adminDeleteUser(username: string): Promise<void> {
  return fetcher(`/api/admin/users/${username}`, { method: "DELETE" });
}

export function adminRecropImages(): Promise<{ cropped: number; failed: number }> {
  return fetcher("/api/admin/recrop-images", { method: "POST" });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return fetcher("/api/auth/password", {
    method: "PUT",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export function getItems(): Promise<ClothingItem[]> {
  return fetcher("/api/items");
}

export function searchItems(query: string): Promise<ClothingItem[]> {
  if (!query.trim()) return getItems();
  return fetcher(`/api/items/search?q=${encodeURIComponent(query.trim())}`);
}

export function getItemsPage(limit: number, after?: string): Promise<Page<ClothingItem>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return fetcher(`/api/items?${params}`);
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
): Promise<{ status: string; raw_image_url: string; colors?: string[] }> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${API_BASE}/api/items/${id}/image`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed ${res.status}`);
  }
  return res.json();
}

// Outfits

export function getOutfits(): Promise<Outfit[]> {
  return fetcher("/api/outfits", { cache: "no-store" });
}

export function getOutfitsPage(limit: number, after?: string): Promise<Page<Outfit>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return fetcher(`/api/outfits?${params}`, { cache: "no-store" });
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

export function getHangurStats(): Promise<HangurStats> {
  return fetcher(`/api/stats`);
}

export function getWishlistItems(): Promise<WishlistItem[]> {
  return fetcher("/api/wishlist");
}

export function getWishlistPage(limit: number, after?: string): Promise<Page<WishlistItem>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return fetcher(`/api/wishlist?${params}`);
}

export function createWishlistItem(data: CreateWishlistItemRequest): Promise<WishlistItem> {
  return fetcher("/api/wishlist", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateWishlistItem(id: string, data: { priority?: number; notes?: string; bought?: boolean }): Promise<WishlistItem> {
  return fetcher(`/api/wishlist/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteWishlistItem(id: string): Promise<void> {
  return fetcher(`/api/wishlist/${id}`, { method: "DELETE" });
}

export function fetchWishlistMeta(url: string): Promise<{ image_url: string; title: string; price: string; currency: string }> {
  return fetcher(`/api/wishlist/fetch-meta?url=${encodeURIComponent(url)}`);
}

// --- Heatmap & profile ---

export function getWearHeatmap(year: number): Promise<HeatmapEntry[]> {
  return fetcher(`/api/stats/wear-heatmap?year=${year}`);
}

export function getPublicProfile(username: string): Promise<PublicProfile> {
  return fetcher(`/api/profile/public/${username}`);
}

export function getFeed(limit: number, after?: string): Promise<Page<import("./types").FeedItem>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (after) params.set("after", after);
  return fetcher(`/api/feed?${params}`);
}

export function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetcher("/api/leaderboard");
}

export function getPublicItem(username: string, id: string): Promise<ClothingItem> {
  return fetcher(`/api/profile/public/${username}/items/${id}`);
}

export function updateOutfitLayout(outfitId: string, items: OutfitItemLayoutUpdate[]): Promise<Outfit> {
  return fetcher(`/api/outfits/${outfitId}/layout`, {
    method: "PUT",
    body: JSON.stringify(items),
  });
}

export function getPublicOutfit(username: string, id: string): Promise<Outfit> {
  return fetcher(`/api/profile/public/${username}/outfits/${id}`);
}

// --- Currency ---

export type CurrencyRates = Record<string, number>;

const RATES_CACHE_KEY = "currency_rates_cache";
const RATES_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(): Promise<CurrencyRates> {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (cached) {
      const { ts, rates } = JSON.parse(cached);
      if (Date.now() - ts < RATES_TTL_MS) return rates;
    }
  } catch {}

  const res = await fetch("https://open.er-api.com/v6/latest/PKR");
  const json = await res.json();
  const rates: CurrencyRates = { PKR: 1, ...json.rates };

  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: Date.now(), rates }));
  } catch {}

  return rates;
}

// thumbnailUrl returns the thumbnail URL for grid display.
// Falls back to imageUrl if no thumbnail is available.
export function thumbnailUrl(item: { thumbnail_url?: string; image_url?: string; raw_image_url?: string }): string {
  if (item.thumbnail_url) return imageUrl(item.thumbnail_url);
  if (item.image_url) return imageUrl(item.image_url);
  if (item.raw_image_url) return imageUrl(item.raw_image_url);
  return "";
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
