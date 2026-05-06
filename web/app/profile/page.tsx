"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useUser } from "@/lib/user-context";
import {
  getHangurStats, getOutfitsPage, getWearHeatmap,
  getWishlistItems, getItems, imageUrl, thumbnailUrl, updateOutfit, getOutfitLogs,
} from "@/lib/api";
import { outfitRefreshStore } from "@/lib/outfit-refresh";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WearHeatmap } from "@/components/wear-heatmap";
import { OutfitCard } from "@/components/outfit-card";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { ShimmerImg } from "@/components/shimmer-img";
import { HangurAvatar } from "@/components/hangur-avatar";
import { CategoryPixelBox } from "@/components/category-pixel-box";
import { Share2, Check, ExternalLink, Star, Heart, ChevronLeft, ChevronRight, Pin, EyeOff, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { applyTheme, saveTheme, loadTheme, type ThemeId } from "@/lib/theme";
import type { HangurStats, Outfit, HeatmapEntry, WishlistItem, ClothingItem, OutfitLog } from "@/lib/types";

const CATEGORY_WEIGHT: Record<string, number> = {
  outerwear: 5, top: 4, bottom: 3, shoes: 2, accessory: 1,
};
const sortByCategory = (items: ClothingItem[]) =>
  [...items].sort(
    (a, b) =>
      (CATEGORY_WEIGHT[b.category?.toLowerCase() ?? ""] ?? 0) -
      (CATEGORY_WEIGHT[a.category?.toLowerCase() ?? ""] ?? 0)
  );
const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const buildMonthCells = (year: number, month: number): (Date | null)[] => {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
  return cells;
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();



async function doShare(title: string, url: string, onCopied: () => void) {
  if (typeof navigator === "undefined") return;
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch {}
  }
  await navigator.clipboard.writeText(url);
  onCopied();
}

export default function ProfilePage() {
  const { user, hydrated } = useUser();
  const router = useRouter();
  const today = new Date();
  const currentYear = today.getFullYear();
  const outfitVersion = useSyncExternalStore(
    outfitRefreshStore.subscribe,
    outfitRefreshStore.getSnapshot,
    () => 0,
  );

  const [stats, setStats] = useState<HangurStats | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [heatmapYear, setHeatmapYear] = useState(currentYear);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [wearLogs, setWearLogs] = useState<OutfitLog[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [neverWorn, setNeverWorn] = useState<ClothingItem[]>([]);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [galleryTab, setGalleryTab] = useState<"visible" | "hidden">("visible");
  const [theme, setTheme] = useState<ThemeId>("");


  useEffect(() => {
    if (!hydrated || !user) return;
    Promise.all([
      getHangurStats(),
      getOutfitsPage(50),
      getWishlistItems(),
      getItems(),
    ]).then(([s, page, wl, items]) => {
      setStats(s);
      setOutfits(page.data);
      setWishlist(wl.filter(w => !w.bought_at));
      setNeverWorn(items.filter(i => !i.last_worn));
    }).finally(() => setLoading(false));
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user || outfitVersion === 0) return;
    getOutfitsPage(50).then((page) => setOutfits(page.data));
  }, [outfitVersion, hydrated, user]);

  useEffect(() => {
    const y = monthAnchor.getFullYear();
    if (y !== heatmapYear) setHeatmapYear(y);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthAnchor]);

  useEffect(() => {
    if (!hydrated || !user) return;
    const start = `${heatmapYear}-01-01`;
    const end = `${heatmapYear}-12-31`;
    Promise.all([
      getWearHeatmap(heatmapYear),
      getOutfitLogs(start, end),
    ]).then(([hm, logs]) => {
      setHeatmap(hm);
      setWearLogs([...logs].sort((a, b) => b.wear_date.localeCompare(a.wear_date)));
    });
  }, [heatmapYear, hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    setTheme(loadTheme(user.username));
  }, [hydrated, user]);

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}/p/${user.username}`;
    doShare(`${user.display_name}'s Hangur`, url, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!hydrated || !user) return null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 pb-24">

      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
            <HangurAvatar colors={stats?.colors ?? []} username={user.username} size={56} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleShare}>
            {copied
              ? <><Check className="h-4 w-4 text-green-500" />Copied</>
              : <><Share2 className="h-4 w-4" />Share</>}
          </Button>
        </div>
      </div>

      {/* theme picker */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Appearance</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {([{ id: "", label: "Default", color: "var(--default-primary,oklch(0.55 0.02 0))" },
             { id: "theme-alishba", label: "Alishba", color: "oklch(0.72 0.17 350)" },
             { id: "theme-sage", label: "Sage", color: "oklch(0.50 0.14 148)" },
             { id: "theme-mauve", label: "Mauve", color: "oklch(0.50 0.14 310)" },
             { id: "theme-ocean", label: "Ocean", color: "oklch(0.50 0.14 240)" },
             { id: "theme-clay", label: "Clay", color: "oklch(0.50 0.14 40)" },
             { id: "theme-noir", label: "Noir", color: "oklch(0.50 0 0)" },
          ] as const).map(({ id, label, color }) => {
            const active = id === theme;
            return (
              <button
                key={id}
                onClick={() => {
                  setTheme(id);
                  applyTheme(id);
                  if (user) saveTheme(user.username, id);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <span className="w-4 h-4 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: color }} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* numbers */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Overview</h2>
            </div>
            {stats && (
              <>
                {/* main stats */}
                <Card className="p-4">
                  <div className="grid grid-cols-3 divide-x divide-border">
                    <div className="text-center pr-4">
                      <p className="text-3xl font-bold tracking-tight">{stats.total_items}</p>
                      <p className="text-xs text-muted-foreground mt-1">Items</p>
                    </div>
                    <div className="text-center px-4">
                      <p className="text-3xl font-bold tracking-tight">{stats.total_outfits}</p>
                      <p className="text-xs text-muted-foreground mt-1">Outfits</p>
                    </div>
                    <div className="text-center pl-4">
                      <p className="text-3xl font-bold tracking-tight">{stats.total_wears}</p>
                      <p className="text-xs text-muted-foreground mt-1">Wears</p>
                      {stats.wears_this_month > 0 && (
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stats.wears_this_month} this month</p>
                      )}
                    </div>
                  </div>
                </Card>

                {/* never worn callout */}
                {stats.never_worn_items > 0 && stats.total_items > 0 && (
                  <p className="text-sm text-muted-foreground px-1">
                    You haven&apos;t worn{" "}
                    <span className="font-semibold text-foreground">
                      {Math.round((stats.never_worn_items / stats.total_items) * 100)}%
                    </span>{" "}
                    of your hangur.
                  </p>
                )}

                {/* category bars */}
                {stats.items_by_category.length > 0 && (
                  <Card className="p-4 space-y-2.5">
                    {stats.items_by_category.map((cat) => (
                      <div key={cat.category} className="flex items-center gap-3">
                        <span className="text-xs capitalize w-20 shrink-0 text-muted-foreground">{cat.category}</span>
                        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-foreground/30 rounded-full"
                            style={{ width: `${(cat.count / (stats.total_items || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-4 text-right tabular-nums text-muted-foreground">{cat.count}</span>
                      </div>
                    ))}
                  </Card>
                )}

                {/* category pixel boxes */}
                {stats.items_by_category.some(cat => cat.colors?.length > 0) && (
                  <Card className="p-4">
                    <div className="flex flex-wrap gap-4">
                      {stats.items_by_category.filter(cat => cat.colors?.length > 0).map(cat => (
                        <div key={cat.category} className="flex flex-col items-center gap-1.5">
                          <CategoryPixelBox colors={cat.colors} size={48} />
                          <span className="text-xs capitalize text-muted-foreground">{cat.category}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </section>

          {/* wear calendar */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Wear Calendar</h2>
                              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setHeatmapYear(y => y - 1)}
                  disabled={heatmapYear <= 2023}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-10 text-center">{heatmapYear}</span>
                <Button
                  variant="ghost" size="icon" className="h-7 w-7"
                  onClick={() => setHeatmapYear(y => y + 1)}
                  disabled={heatmapYear >= currentYear}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Card className="p-4">
              <WearHeatmap data={heatmap} year={heatmapYear} />
            </Card>

            {(() => {
              const logsMap = new Map(
                wearLogs.map(log => [log.wear_date.split("T")[0], log])
              );
              const cells = buildMonthCells(monthAnchor.getFullYear(), monthAnchor.getMonth());
              const atCurrent =
                monthAnchor.getFullYear() === today.getFullYear() &&
                monthAnchor.getMonth() === today.getMonth();
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setMonthAnchor(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {monthAnchor.toLocaleString("default", { month: "long", year: "numeric" })}
                    </span>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setMonthAnchor(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                      disabled={atCurrent}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Card className="p-3">
                    <div className="grid grid-cols-7 gap-1">
                      {["S","M","T","W","T","F","S"].map((d, i) => (
                        <div key={i} className="text-center text-[10px] text-muted-foreground py-1">{d}</div>
                      ))}
                      {cells.map((date, idx) => {
                        const dateStr = date ? toKey(date) : null;
                        const log = dateStr ? logsMap.get(dateStr) ?? null : null;
                        const hasLog = !!log;
                        const isToday = !!date && isSameDay(date, today);
                        const sortedItems = log?.items ? sortByCategory(log.items) : [];
                        return (
                          <div
                            key={idx}
                            className={`relative aspect-square rounded-md flex items-center justify-center transition-colors ${
                              !date
                                ? "bg-transparent"
                                : hasLog
                                  ? "bg-primary/10 hover:bg-primary/20 cursor-pointer"
                                  : "bg-muted/30 hover:bg-muted/40 cursor-pointer"
                            } ${isToday ? "ring-1 ring-primary" : ""}`}
                            onClick={() => date && router.push(`/logger/${toKey(date)}`)}
                          >
                            {date && (
                              <>
                                <span className={`absolute top-0.5 left-1 text-[9px] font-medium leading-none z-10 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                                  {date.getDate()}
                                </span>
                                {hasLog && sortedItems.length > 0 && (
                                  <div className="absolute inset-[8px] top-[14px]">
                                    <OutfitCanvas items={sortedItems.slice(0, 4)} />
                                  </div>
                                )}
                                {hasLog && sortedItems.length === 0 && (
                                  <div className="w-2 h-2 rounded-full bg-primary mt-3" />
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              );
            })()}
          </section>

          {/* outfit gallery */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Outfit Gallery</h2>
                              </div>
              <div className="flex items-center gap-1 text-sm">
                <button
                  onClick={() => setGalleryTab("visible")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${galleryTab === "visible" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Gallery
                </button>
                <button
                  onClick={() => setGalleryTab("hidden")}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${galleryTab === "hidden" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Hidden {outfits.filter(o => o.hidden).length > 0 && `(${outfits.filter(o => o.hidden).length})`}
                </button>
              </div>
            </div>
            {(() => {
              const shown = outfits.filter(o => galleryTab === "hidden" ? o.hidden : !o.hidden);
              if (shown.length === 0) return (
                <p className="text-sm text-muted-foreground">{galleryTab === "hidden" ? "No hidden outfits." : "No outfits yet."}</p>
              );
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {shown.map((o) => (
                    <OutfitCard
                      key={o.id}
                      outfit={o}
                      onToggleHidden={() => {
                        updateOutfit(o.id, { hidden: !o.hidden }).then(updated =>
                          setOutfits(prev => prev.map(x => x.id === updated.id ? updated : x))
                        );
                      }}
                      onTogglePinned={() => {
                        updateOutfit(o.id, { pinned: !o.pinned }).then(updated =>
                          setOutfits(prev => prev.map(x => x.id === updated.id ? updated : x))
                        );
                      }}
                    />
                  ))}
                </div>
              );
            })()}
          </section>

          {/* signature pieces */}
          {stats && stats.top_worn_items.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Signature Pieces</h2>
                              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {stats.top_worn_items.map(({ item, wear_count }) => {
                  const src = item.image_status === "done" || item.raw_image_url ? thumbnailUrl(item) : null;
                  return (
                    <Link key={item.id} href={`/items/${item.id}`}>
                      <Card className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
                        <div className="aspect-square bg-muted/40 flex items-center justify-center relative">
                          {src
                            ? <ShimmerImg src={src} alt={item.category} className="w-full h-full object-contain" />
                            : <span className="text-2xl">👕</span>}
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 py-0.5 rounded font-medium">
                            {wear_count}×
                          </div>
                        </div>
                        <div className="p-1.5">
                          <p className="text-xs font-medium capitalize truncate">{item.name || item.sub_category || item.category}</p>
                          {item.brand && <p className="text-[10px] text-muted-foreground truncate">{item.brand}</p>}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* never worn */}
          {neverWorn.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                Never Worn <span className="text-xs font-normal">({neverWorn.length})</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {neverWorn.slice(0, 8).map((item) => {
                  const src = item.image_status === "done" && item.image_url
                    ? imageUrl(item.image_url)
                    : item.raw_image_url ? imageUrl(item.raw_image_url) : null;
                  return (
                    <Link key={item.id} href={`/items/${item.id}`}>
                      <Card className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
                        <div className="aspect-square bg-muted/40 flex items-center justify-center">
                          {src
                            ? <img src={src} alt={item.category} className="w-full h-full object-contain p-1" />
                            : <span className="text-2xl">👕</span>}
                        </div>
                        <div className="p-1.5">
                          <p className="text-xs font-medium capitalize truncate">{item.name || item.sub_category || item.category}</p>
                          {item.brand && <p className="text-[10px] text-muted-foreground truncate">{item.brand}</p>}
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
              {neverWorn.length > 8 && (
                <p className="text-xs text-muted-foreground">+{neverWorn.length - 8} more</p>
              )}
            </section>
          )}

          {/* wishlist */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Wishlist</h2>
                          </div>
            {wishlist.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wishlist items yet.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto py-1 -mx-4 px-4">
                {[...wishlist].sort((a, b) => b.priority - a.priority).map((item) => (
                  <a
                    key={item.id}
                    href={item.product_url || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 w-32"
                  >
                    <Card className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
                      <div className="aspect-square bg-muted/40 flex items-center justify-center">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">🛍️</span>
                        )}
                      </div>
                      <div className="p-1.5 space-y-0.5">
                        <div className="flex items-center gap-1">
                          {item.priority === 1 && (
                            <Heart className="h-3 w-3 shrink-0 text-red-500 fill-red-500" />
                          )}
                          <p className="text-xs font-medium truncate">{item.name}</p>
                        </div>
                        {item.price_pkr > 0 && (
                          <p className="text-[10px] text-muted-foreground">PKR {item.price_pkr.toLocaleString()}</p>
                        )}
                      </div>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
