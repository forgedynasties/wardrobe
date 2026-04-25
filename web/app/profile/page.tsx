"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/user-context";
import {
  getProfileSettings, getWardrobeStats, getOutfitsPage, getWearHeatmap,
  getWishlistItems, getItems, imageUrl, thumbnailUrl,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WearHeatmap } from "@/components/wear-heatmap";
import { OutfitCard } from "@/components/outfit-card";
import { ShimmerImg } from "@/components/shimmer-img";
import { WardrobeAvatar } from "@/components/wardrobe-avatar";
import { Settings, Share2, Check, Lock, ExternalLink, Star, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WardrobeStats, Outfit, HeatmapEntry, ProfileConfig, WishlistItem, ClothingItem } from "@/lib/types";

function PrivateBadge() {
  return (
    <Badge variant="secondary" className="gap-1 text-xs font-normal">
      <Lock className="h-3 w-3" />
      Private
    </Badge>
  );
}

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
  const currentYear = new Date().getFullYear();

  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [stats, setStats] = useState<WardrobeStats | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [heatmapYear, setHeatmapYear] = useState(currentYear);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [neverWorn, setNeverWorn] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    Promise.all([
      getProfileSettings(),
      getWardrobeStats(),
      getOutfitsPage(50),
      getWearHeatmap(currentYear),
      getWishlistItems(),
      getItems(),
    ]).then(([cfg, s, page, hm, wl, items]) => {
      setConfig(cfg);
      setStats(s);
      setOutfits(page.data);
      setHeatmap(hm);
      setWishlist(wl.filter(w => !w.bought_at));
      setNeverWorn(items.filter(i => !i.last_worn));
    }).finally(() => setLoading(false));
  }, [hydrated, user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    getWearHeatmap(heatmapYear).then(setHeatmap);
  }, [heatmapYear]);

  const handleShare = () => {
    if (!user) return;
    const url = `${window.location.origin}/p/${user.username}`;
    doShare(`${user.display_name}'s Wardrobe`, url, () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!hydrated || !user) return null;

  const sec = config?.sections;
  const isPublic = sec ? Object.values(sec).some(Boolean) : false;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 pb-24">

      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0">
            <WardrobeAvatar colors={stats?.colors ?? []} username={user.username} size={56} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPublic && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleShare}>
              {copied
                ? <><Check className="h-4 w-4 text-green-500" />Copied</>
                : <><Share2 className="h-4 w-4" />Share</>}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => router.push("/profile/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

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
              {!sec?.snapshot && <PrivateBadge />}
            </div>
            {stats && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{stats.total_items}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Items</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{stats.total_outfits}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Outfits</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{stats.total_wears}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Wears</p>
                  </Card>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{stats.avg_wears_per_outfit.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Avg / outfit</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{stats.wears_this_month}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This month</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <p className="text-2xl font-bold">{stats.never_worn_items}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Never worn</p>
                  </Card>
                </div>

                {/* category bars */}
                {stats.items_by_category.length > 0 && (
                  <Card className="p-4 space-y-2">
                    {stats.items_by_category.map((cat) => (
                      <div key={cat.category} className="flex items-center gap-3">
                        <span className="text-xs capitalize w-20 shrink-0 text-muted-foreground">{cat.category}</span>
                        <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full"
                            style={{ width: `${(cat.count / (stats.total_items || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-4 text-right text-muted-foreground">{cat.count}</span>
                      </div>
                    ))}
                  </Card>
                )}

                {/* color palette — pixel art grid */}
                {stats.colors.length > 0 && (
                  <Card className="p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Color Palette</p>
                    <div
                      className="grid gap-[2px]"
                      style={{ gridTemplateColumns: `repeat(${Math.min(stats.colors.length, 10)}, 1fr)` }}
                    >
                      {stats.colors.map((c) => (
                        <div
                          key={c}
                          className="aspect-square"
                          style={{ backgroundColor: c }}
                          title={c}
                        />
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
                {!sec?.calendar && <PrivateBadge />}
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
          </section>

          {/* outfit gallery */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Outfit Gallery</h2>
              {!sec?.outfits && <PrivateBadge />}
            </div>
            {outfits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outfits yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {outfits.map((o) => <OutfitCard key={o.id} outfit={o} />)}
              </div>
            )}
          </section>

          {/* signature pieces */}
          {stats && stats.top_worn_items.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">Signature Pieces</h2>
                {!sec?.signature && <PrivateBadge />}
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
                          <p className="text-xs font-medium capitalize truncate">{item.sub_category || item.category}</p>
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
                          <p className="text-xs font-medium capitalize truncate">{item.sub_category || item.category}</p>
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
              {!sec?.wishlist && <PrivateBadge />}
            </div>
            {wishlist.length === 0 ? (
              <p className="text-sm text-muted-foreground">No wishlist items yet.</p>
            ) : (
              <div className="space-y-2">
                {[...wishlist].sort((a, b) => b.priority - a.priority).map((item) => (
                  <Card key={item.id} className="p-3 flex items-center gap-3">
                    {item.priority === 1 && <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      {item.notes && <p className="text-xs text-muted-foreground truncate">{item.notes}</p>}
                    </div>
                    {item.price_pkr > 0 && (
                      <span className="text-sm font-medium shrink-0">PKR {item.price_pkr.toLocaleString()}</span>
                    )}
                    {item.product_url && (
                      <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
