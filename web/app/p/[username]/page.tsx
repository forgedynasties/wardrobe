"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicProfile, imageUrl, thumbnailUrl } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WearHeatmap } from "@/components/wear-heatmap";
import { ShimmerImg } from "@/components/shimmer-img";
import { OutfitCard } from "@/components/outfit-card";
import { Lock, User } from "lucide-react";
import type { PublicProfile } from "@/lib/types";
import Link from "next/link";

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null | "not-found">(null);

  useEffect(() => {
    getPublicProfile(username)
      .then(setProfile)
      .catch(() => setProfile("not-found"));
  }, [username]);

  if (profile === null) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (profile === "not-found") {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">Profile not found</p>
        <p className="text-sm text-muted-foreground mt-1">This profile is private or doesn't exist.</p>
      </div>
    );
  }

  const hasAnything = !!(
    profile.snapshot || profile.outfits?.length || profile.calendar || profile.signature?.length
  );

  if (!hasAnything) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center justify-center py-24 text-center">
        <Lock className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-lg font-semibold">{profile.display_name}'s profile is private</p>
      </div>
    );
  }

  const year = new Date().getFullYear();

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-8">
      {/* header */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
        </div>
      </div>

      {/* snapshot */}
      {profile.snapshot && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Style Snapshot</h2>
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold">{profile.snapshot.total_items}</p>
              <p className="text-xs text-muted-foreground mt-1">Items</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold">{profile.snapshot.total_outfits}</p>
              <p className="text-xs text-muted-foreground mt-1">Outfits</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold">{profile.snapshot.total_wears}</p>
              <p className="text-xs text-muted-foreground mt-1">Wears</p>
            </Card>
          </div>

          {profile.snapshot.colors.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-medium mb-3">Color Palette</p>
              <div className="flex flex-wrap gap-2">
                {profile.snapshot.colors.map((c) => (
                  <div
                    key={c}
                    className="w-8 h-8 rounded-full border border-border shadow-sm"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </Card>
          )}

          {profile.snapshot.items_by_category.length > 0 && (
            <Card className="p-4">
              <p className="text-sm font-medium mb-3">Categories</p>
              <div className="space-y-2">
                {profile.snapshot.items_by_category.map((cat) => (
                  <div key={cat.category} className="flex items-center gap-3">
                    <span className="text-sm capitalize w-24 shrink-0">{cat.category}</span>
                    <div className="flex-1 h-2 bg-muted/50 rounded overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded"
                        style={{ width: `${(cat.count / (profile.snapshot!.total_items || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-6 text-right">{cat.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* outfit gallery */}
      {profile.outfits && profile.outfits.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Outfit Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {profile.outfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        </div>
      )}

      {/* wear calendar */}
      {profile.calendar && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Wear Calendar {year}</h2>
          <Card className="p-4">
            <WearHeatmap data={profile.calendar} year={year} />
          </Card>
        </div>
      )}

      {/* signature pieces */}
      {profile.signature && profile.signature.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">Signature Pieces</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {profile.signature.map(({ item, wear_count }) => {
              const src = item.image_status === "done" || item.raw_image_url
                ? thumbnailUrl(item)
                : null;
              return (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted/40 flex items-center justify-center relative">
                    {src ? (
                      <ShimmerImg src={src} alt={item.category} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-3xl">👕</span>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                      {wear_count}×
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium capitalize">{item.sub_category || item.category}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-4">
        Made with <Link href="/" className="underline underline-offset-2">Wardrobe</Link>
      </p>
    </div>
  );
}
