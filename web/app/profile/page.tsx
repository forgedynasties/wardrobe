"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/user-context";
import {
  getProfileSettings, getWardrobeStats, getOutfitsPage, getWearHeatmap, imageUrl, thumbnailUrl,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WearHeatmap } from "@/components/wear-heatmap";
import { OutfitCard } from "@/components/outfit-card";
import { ShimmerImg } from "@/components/shimmer-img";
import { Settings, Share2, Check, Lock, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WardrobeStats, Outfit, HeatmapEntry, ProfileConfig } from "@/lib/types";

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

  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [stats, setStats] = useState<WardrobeStats | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const year = new Date().getFullYear();

  useEffect(() => {
    if (!hydrated || !user) return;
    Promise.all([
      getProfileSettings(),
      getWardrobeStats(),
      getOutfitsPage(50),
      getWearHeatmap(year),
    ]).then(([cfg, s, page, hm]) => {
      setConfig(cfg);
      setStats(s);
      setOutfits(page.data);
      setHeatmap(hm);
    }).finally(() => setLoading(false));
  }, [hydrated, user]);

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
    <div className="p-4 max-w-4xl mx-auto space-y-8 pb-24">

      {/* header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
            <User className="h-7 w-7 text-muted-foreground" />
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
        <div className="space-y-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : (
        <>
          {/* snapshot */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Style Snapshot</h2>
              {!sec?.snapshot && <PrivateBadge />}
            </div>
            {stats && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold">{stats.total_items}</p>
                    <p className="text-xs text-muted-foreground mt-1">Items</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold">{stats.total_outfits}</p>
                    <p className="text-xs text-muted-foreground mt-1">Outfits</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-3xl font-bold">{stats.total_wears}</p>
                    <p className="text-xs text-muted-foreground mt-1">Wears</p>
                  </Card>
                </div>
                {stats.colors.length > 0 && (
                  <Card className="p-4">
                    <p className="text-sm font-medium mb-3">Color Palette</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.colors.map((c) => (
                        <div key={c} className="w-8 h-8 rounded-full border border-border shadow-sm" style={{ backgroundColor: c }} title={c} />
                      ))}
                    </div>
                  </Card>
                )}
                {stats.items_by_category.length > 0 && (
                  <Card className="p-4">
                    <p className="text-sm font-medium mb-3">Categories</p>
                    <div className="space-y-2">
                      {stats.items_by_category.map((cat) => (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="text-sm capitalize w-24 shrink-0">{cat.category}</span>
                          <div className="flex-1 h-2 bg-muted/50 rounded overflow-hidden">
                            <div className="h-full bg-primary/70 rounded" style={{ width: `${(cat.count / (stats.total_items || 1)) * 100}%` }} />
                          </div>
                          <span className="text-sm font-medium w-6 text-right">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </section>

          {/* outfit gallery */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Outfit Gallery</h2>
              {!sec?.outfits && <PrivateBadge />}
            </div>
            {outfits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outfits yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {outfits.map((o) => <OutfitCard key={o.id} outfit={o} />)}
              </div>
            )}
          </section>

          {/* wear calendar */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Wear Calendar</h2>
              {!sec?.calendar && <PrivateBadge />}
            </div>
            <Card className="p-4">
              <WearHeatmap data={heatmap} year={year} />
            </Card>
          </section>

          {/* signature pieces */}
          {stats && stats.top_worn_items.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Signature Pieces</h2>
                {!sec?.signature && <PrivateBadge />}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {stats.top_worn_items.map(({ item, wear_count }) => {
                  const src = item.image_status === "done" || item.raw_image_url ? thumbnailUrl(item) : null;
                  return (
                    <Link key={item.id} href={`/items/${item.id}`}>
                      <Card className="overflow-hidden hover:ring-2 hover:ring-primary/40 transition-all">
                        <div className="aspect-square bg-muted/40 flex items-center justify-center relative">
                          {src
                            ? <ShimmerImg src={src} alt={item.category} className="w-full h-full object-contain" />
                            : <span className="text-3xl">👕</span>}
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            {wear_count}×
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-sm font-medium capitalize">{item.sub_category || item.category}</p>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
