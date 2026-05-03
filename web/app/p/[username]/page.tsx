"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPublicProfile, getProfileSettings,
  getHangurStats, getOutfitsPage, getWearHeatmap, getOutfitLogs,
  getWishlistItems, getItems, thumbnailUrl, imageUrl,
  updateOutfit,
} from "@/lib/api";
import { outfitRefreshStore } from "@/lib/outfit-refresh";
import { useUser } from "@/lib/user-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WearHeatmap } from "@/components/wear-heatmap";
import { OutfitCard } from "@/components/outfit-card";
import { OutfitCanvas } from "@/components/outfit-canvas";
import { ShimmerImg } from "@/components/shimmer-img";
import { HangurAvatar } from "@/components/hangur-avatar";
import { CategoryPixelBox } from "@/components/category-pixel-box";
import { Settings, Share2, Check, ChevronLeft, ChevronRight, Heart, Lock, LayoutGrid, Shirt, Rows2, Layers, Footprints, Gem, Package } from "lucide-react";
import type {
  HangurStats, Outfit, HeatmapEntry, ProfileConfig,
  WishlistItem, ClothingItem, OutfitLog, PublicProfile,
} from "@/lib/types";

function PrivateSection({ label }: { label: string }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">{label}</h2>
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed text-muted-foreground text-sm">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>This section is private</span>
      </div>
    </section>
  );
}

const CATEGORY_WEIGHT: Record<string, number> = {
  outerwear: 5, top: 4, bottom: 3, shoes: 2, accessory: 1,
};
const sortByCategory = (items: ClothingItem[]) =>
  [...items].sort(
    (a, b) =>
      (CATEGORY_WEIGHT[b.category?.toLowerCase() ?? ""] ?? 0) -
      (CATEGORY_WEIGHT[a.category?.toLowerCase() ?? ""] ?? 0),
  );

const toKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const startOfWeek = (d: Date): Date => {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
};
const buildWeekDays = (weekStart: Date): Date[] =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
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
  const { username } = useParams<{ username: string }>();
  const { user, hydrated } = useUser();
  const router = useRouter();
  const isSelf = hydrated && !!user && user.username === username;

  const today = new Date();
  const currentYear = today.getFullYear();

  // Self-view state
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
  const [allItems, setAllItems] = useState<ClothingItem[]>([]);
  const [itemsTab, setItemsTab] = useState("all");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(today));
  const [galleryTab, setGalleryTab] = useState<"visible" | "hidden">("visible");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [avatarColors, setAvatarColors] = useState<string[]>([]);

  // Other-view state
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null | "not-found">(null);

  // Load self data
  useEffect(() => {
    if (!hydrated) return;
    if (!isSelf) return;
    Promise.all([
      getProfileSettings(),
      getHangurStats(),
      getOutfitsPage(50),
      getWishlistItems(),
      getItems(),
    ]).then(([_cfg, s, page, wl, items]) => {
      setStats(s);
      setOutfits(page.data);
      setWishlist(wl.filter((w) => !w.bought_at));
      setNeverWorn(items.filter((i) => !i.last_worn));
      setAllItems(items);
    }).finally(() => setLoading(false));
  }, [hydrated, isSelf]);

  useEffect(() => {
    if (!isSelf || outfitVersion === 0) return;
    getOutfitsPage(50).then((page) => setOutfits(page.data));
  }, [outfitVersion, isSelf]);

  useEffect(() => {
    if (!isSelf) return;
    const start = `${heatmapYear}-01-01`;
    const end = `${heatmapYear}-12-31`;
    Promise.all([
      getWearHeatmap(heatmapYear),
      getOutfitLogs(start, end),
    ]).then(([hm, logs]) => {
      setHeatmap(hm);
      setWearLogs([...logs].sort((a, b) => b.wear_date.localeCompare(a.wear_date)));
    });
  }, [heatmapYear, isSelf]);

  // Load public data (always — avatar_colors must match what others see)
  useEffect(() => {
    if (!hydrated) return;
    getPublicProfile(username)
      .then((p) => {
        setAvatarColors(p.avatar_colors ?? []);
        if (!isSelf) {
          setPublicProfile(p);
          setAllItems(p.items ?? []);
        }
      })
      .catch(() => { if (!isSelf) setPublicProfile("not-found"); });
  }, [hydrated, username, isSelf]);

  const handleShare = () => {
    const displayName = isSelf ? user!.display_name : (publicProfile as PublicProfile)?.display_name ?? username;
    const url = `${window.location.origin}/p/${username}`;
    doShare(`${displayName}'s Hangur`, url, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Wait until we know if self or not
  if (!hydrated) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // Other-view: loading
  if (!isSelf && publicProfile === null) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  // Other-view: not found / private
  if (!isSelf && (publicProfile === "not-found" || !publicProfile)) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold">Profile not found</p>
        <p className="text-sm text-muted-foreground mt-1">This profile is private or doesn&apos;t exist.</p>
      </div>
    );
  }

  // Normalise data for rendering
  const displayName = isSelf ? user!.display_name : (publicProfile as PublicProfile).display_name;
  const usernameLabel = isSelf ? user!.username : (publicProfile as PublicProfile).username;

  const pub = !isSelf ? (publicProfile as PublicProfile) : null;

  // Section visibility for other viewers: enabled = section is on, has data or is known private
  const pubSections = pub?.sections;
  const allPrivate = !isSelf && pubSections != null &&
    !pubSections.snapshot && !pubSections.outfits && !pubSections.calendar && !pubSections.signature && !pubSections.wishlist;

  const showSnapshot = isSelf || !!pubSections?.snapshot;
  const showOutfits = isSelf || !!pubSections?.outfits;
  const showCalendar = isSelf || !!pubSections?.calendar;
  const showSignature = isSelf || !!pubSections?.signature;
  const showWishlist = isSelf || !!pubSections?.wishlist;

  const shownOutfits = isSelf
    ? outfits.filter((o) => galleryTab === "hidden" ? o.hidden : !o.hidden)
    : (pub?.outfits ?? []);

  const topWornItems = isSelf
    ? (stats?.top_worn_items ?? [])
    : (pub?.signature ?? []);

  const calendarData = isSelf ? heatmap : (pub?.calendar ?? []);
  const calYear = isSelf ? heatmapYear : currentYear;

  const wishlistItems = isSelf
    ? [...wishlist].sort((a, b) => b.priority - a.priority)
    : [...(pub?.wishlist ?? [])].sort((a, b) => b.priority - a.priority);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 pb-24">
      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
            <HangurAvatar colors={avatarColors} username={usernameLabel} size={56} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{displayName}</h1>
            <p className="text-sm text-muted-foreground">@{usernameLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleShare}>
            {copied
              ? <><Check className="h-4 w-4 text-green-500" />Copied</>
              : <><Share2 className="h-4 w-4" />Share</>}
          </Button>
          {isSelf && (
            <Button variant="ghost" size="icon" onClick={() => router.push("/profile/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {isSelf && loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : allPrivate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Private profile</p>
          <p className="text-sm text-muted-foreground">This person hasn&apos;t made their hangur public yet.</p>
        </div>
      ) : (
        <>
          {/* overview / snapshot */}
          {showSnapshot && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Overview</h2>
              {(() => {
                const s = isSelf ? stats : pub?.snapshot;
                if (!s) return null;
                return (
                  <>
                    <Card className="p-4">
                      <div className="grid grid-cols-3 divide-x divide-border">
                        <div className="text-center pr-4">
                          <p className="text-3xl font-bold tracking-tight">{s.total_items}</p>
                          <p className="text-xs text-muted-foreground mt-1">Items</p>
                        </div>
                        <div className="text-center px-4">
                          <p className="text-3xl font-bold tracking-tight">{s.total_outfits}</p>
                          <p className="text-xs text-muted-foreground mt-1">Outfits</p>
                        </div>
                        <div className="text-center pl-4">
                          <p className="text-3xl font-bold tracking-tight">{s.total_wears}</p>
                          <p className="text-xs text-muted-foreground mt-1">Wears</p>
                          {isSelf && s.wears_this_month > 0 && (
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.wears_this_month} this month</p>
                          )}
                        </div>
                      </div>
                    </Card>

                    {isSelf && s.never_worn_items > 0 && s.total_items > 0 && (
                      <p className="text-sm text-muted-foreground px-1">
                        You haven&apos;t worn{" "}
                        <span className="font-semibold text-foreground">
                          {Math.round((s.never_worn_items / s.total_items) * 100)}%
                        </span>{" "}
                        of your hangur.
                      </p>
                    )}

                    {s.items_by_category.length > 0 && (
                      <Card className="p-4 space-y-2.5">
                        {s.items_by_category.map((cat) => (
                          <div key={cat.category} className="flex items-center gap-3">
                            <span className="text-xs capitalize w-20 shrink-0 text-muted-foreground">{cat.category}</span>
                            <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-foreground/30 rounded-full"
                                style={{ width: `${(cat.count / (s.total_items || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-4 text-right tabular-nums text-muted-foreground">{cat.count}</span>
                          </div>
                        ))}
                      </Card>
                    )}

                    {s.items_by_category.some((cat) => cat.colors?.length > 0) && (
                      <Card className="p-4">
                        <div className="flex flex-wrap gap-4">
                          {s.items_by_category.filter((cat) => cat.colors?.length > 0).map((cat) => (
                            <div key={cat.category} className="flex flex-col items-center gap-1.5">
                              <CategoryPixelBox colors={cat.colors} size={48} />
                              <span className="text-xs capitalize text-muted-foreground">{cat.category}</span>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </>
                );
              })()}
            </section>
          )}

          {/* snapshot hidden placeholder */}
          {!isSelf && !showSnapshot && (
            <PrivateSection label="Overview" />
          )}

          {/* outfit gallery */}
          {showOutfits && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Outfit Gallery</h2>
                {isSelf && (
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
                      Hidden {outfits.filter((o) => o.hidden).length > 0 && `(${outfits.filter((o) => o.hidden).length})`}
                    </button>
                  </div>
                )}
              </div>
              {shownOutfits.length === 0 ? (
                <p className="text-sm text-muted-foreground">{isSelf && galleryTab === "hidden" ? "No hidden outfits." : "No outfits yet."}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {shownOutfits.map((o) => (
                    <OutfitCard
                      key={o.id}
                      outfit={o}
                      href={isSelf ? undefined : `/p/${username}/outfits/${o.id}`}
                      onToggleHidden={isSelf ? () => {
                        updateOutfit(o.id, { hidden: !o.hidden }).then((updated) =>
                          setOutfits((prev) => prev.map((x) => x.id === updated.id ? updated : x))
                        );
                      } : undefined}
                      onTogglePinned={isSelf ? () => {
                        updateOutfit(o.id, { pinned: !o.pinned }).then((updated) =>
                          setOutfits((prev) => prev.map((x) => x.id === updated.id ? updated : x))
                        );
                      } : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* outfits hidden placeholder */}
          {!isSelf && !showOutfits && (
            <PrivateSection label="Outfit Gallery" />
          )}

          {/* wear calendar */}
          {showCalendar && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Wear Calendar</h2>
                {isSelf && (
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setHeatmapYear((y) => y - 1)} disabled={heatmapYear <= 2023}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium w-10 text-center">{heatmapYear}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setHeatmapYear((y) => y + 1)} disabled={heatmapYear >= currentYear}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <Card className="p-4">
                <WearHeatmap data={calendarData} year={calYear} />
              </Card>

              {(() => {
                const pubLogs = isSelf ? wearLogs : (pub?.outfit_logs ?? []);
                const logsMap = new Map(pubLogs.map((log) => [log.wear_date.split("T")[0], log]));
                const heatmapMap = new Map(calendarData.map((e) => [e.date, e.count]));
                const weekDays = buildWeekDays(weekAnchor);
                const weekEnd = weekDays[6];
                const atCurrent = isSameDay(weekAnchor, startOfWeek(today));
                const weekLabel = (() => {
                  const s = weekDays[0];
                  const e = weekDays[6];
                  if (s.getMonth() === e.getMonth())
                    return s.toLocaleString("default", { month: "long", year: "numeric" });
                  return `${s.toLocaleString("default", { month: "short" })} – ${e.toLocaleString("default", { month: "short", year: "numeric" })}`;
                })();
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setWeekAnchor((w) => { const d = new Date(w); d.setDate(d.getDate() - 7); return d; })}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium">{weekLabel}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => setWeekAnchor((w) => { const d = new Date(w); d.setDate(d.getDate() + 7); return d; })}
                        disabled={atCurrent}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Card className="p-3">
                      <div className="grid grid-cols-7 gap-1.5">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                          <div key={i} className="text-center text-[10px] text-muted-foreground pb-1">{d}</div>
                        ))}
                        {weekDays.map((date, idx) => {
                          const dateStr = toKey(date);
                          const log = logsMap.get(dateStr) ?? null;
                          const hasLog = !!log || !!(heatmapMap.get(dateStr));
                          const isToday = isSameDay(date, today);
                          const isFuture = date > today;
                          const sortedItems = log?.items ? sortByCategory(log.items) : [];
                          return (
                            <div
                              key={idx}
                              className={`relative aspect-square rounded-lg flex items-center justify-center transition-colors ${
                                isFuture ? "bg-muted/20 opacity-40"
                                  : hasLog ? "bg-primary/10" + (isSelf ? " hover:bg-primary/20 cursor-pointer" : "")
                                  : "bg-muted/30" + (isSelf ? " hover:bg-muted/40 cursor-pointer" : "")
                              } ${isToday ? "ring-1 ring-primary" : ""}`}
                              onClick={() => isSelf && !isFuture && router.push(`/logger/${dateStr}`)}
                            >
                              <span className={`absolute top-1 left-1.5 text-[9px] font-medium leading-none z-10 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
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
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  </div>
                );
              })()}
            </section>
          )}

          {/* calendar hidden placeholder */}
          {!isSelf && !showCalendar && (
            <PrivateSection label="Wear Calendar" />
          )}

          {/* all items with category tabs */}
          {(() => {
            const knownCats = ["top", "bottom", "outerwear", "shoes", "accessory"];
            const TABS = [
              { key: "all", label: "All", Icon: LayoutGrid },
              { key: "top", label: "Tops", Icon: Shirt },
              { key: "bottom", label: "Bottoms", Icon: Rows2 },
              { key: "outerwear", label: "Outer", Icon: Layers },
              { key: "shoes", label: "Shoes", Icon: Footprints },
              { key: "accessory", label: "Accessories", Icon: Gem },
              { key: "other", label: "Other", Icon: Package },
            ];
            const visibleTabs = TABS.filter(t => {
              if (t.key === "all") return true;
              if (t.key === "other") return allItems.some(i => !knownCats.includes(i.category?.toLowerCase() ?? ""));
              return allItems.some(i => i.category?.toLowerCase() === t.key);
            });
            const filtered = itemsTab === "all"
              ? allItems
              : itemsTab === "other"
                ? allItems.filter(i => !knownCats.includes(i.category?.toLowerCase() ?? ""))
                : allItems.filter(i => i.category?.toLowerCase() === itemsTab);
            return (
              <section className="space-y-3">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Items</h2>
                <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                  {visibleTabs.map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setItemsTab(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                        itemsTab === key
                          ? "bg-foreground text-background"
                          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {filtered.map((item) => {
                      const src = item.image_status === "done" || item.raw_image_url ? thumbnailUrl(item) : null;
                      const neverWornItem = !item.last_worn;
                      return (
                        <Link key={item.id} href={isSelf ? `/items/${item.id}` : `/p/${username}/items/${item.id}`}>
                          <Card className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
                            <div className="aspect-square bg-muted/40 flex items-center justify-center relative">
                              {src
                                ? <ShimmerImg src={src} alt={item.category} className="w-full h-full object-contain" />
                                : <span className="text-2xl">👕</span>}
                              {neverWornItem && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                              )}
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
                )}
              </section>
            );
          })()}



          {/* wishlist hidden placeholder */}
          {!isSelf && !showWishlist && (
            <PrivateSection label="Wishlist" />
          )}

          {/* wishlist */}
          {showWishlist && wishlistItems.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Wishlist</h2>
              <div className="flex gap-3 overflow-x-auto py-1 -mx-4 px-4">
                {wishlistItems.map((item) => (
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
            </section>
          )}

          {!isSelf && (
            <p className="text-xs text-muted-foreground text-center pt-4">
              Made with <Link href="/" className="underline underline-offset-2">Hangur</Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
