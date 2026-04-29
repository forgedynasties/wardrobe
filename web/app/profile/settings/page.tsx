"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/user-context";
import { getProfileSettings, setProfileSettings } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, ExternalLink, BarChart3, Sparkles, CalendarDays, Trophy, Heart } from "lucide-react";
import type { ProfileConfig, ProfileSections } from "@/lib/types";
import Link from "next/link";

const SECTION_META: { key: keyof ProfileSections; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "snapshot", label: "Style Snapshot", desc: "Hangur size, categories, and color palette", icon: BarChart3 },
  { key: "outfits", label: "Outfit Gallery", desc: "Grid of outfits you've created", icon: Sparkles },
  { key: "calendar", label: "Wear Calendar", desc: "Heatmap of days you wore outfits", icon: CalendarDays },
  { key: "signature", label: "Signature Pieces", desc: "Your most-worn clothing items", icon: Trophy },
  { key: "wishlist", label: "Wishlist", desc: "Items you want to get (unbought only)", icon: Heart },
];

export default function ProfilePage() {
  const { user, hydrated } = useUser();
  const [config, setConfig] = useState<ProfileConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!hydrated || !user) return;
    getProfileSettings().then(setConfig);
  }, [hydrated, user]);

  const toggle = (key: keyof ProfileSections) => {
    setConfig((prev) =>
      prev
        ? { ...prev, sections: { ...prev.sections, [key]: !prev.sections[key] } }
        : prev
    );
    setSaved(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await setProfileSettings(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const isPublic = config ? Object.values(config.sections).some(Boolean) : false;
  const publicUrl = user ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${user.username}` : "";

  if (!hydrated || !user) return null;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Profile
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Privacy settings</h1>
      </div>

      {/* identity */}
      <Card className="p-4 space-y-1">
        <p className="text-lg font-semibold">{user.display_name}</p>
        <p className="text-sm text-muted-foreground">@{user.username}</p>
      </Card>

      {/* public url */}
      <Card className="p-4 space-y-2">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your public URL</p>
        <div className="flex items-center justify-between gap-3">
          <code className="text-sm bg-muted px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            /p/{user.username}
          </code>
          {isPublic && (
            <Link href={`/p/${user.username}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                <ExternalLink className="h-3.5 w-3.5" />
                Preview
              </Button>
            </Link>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {isPublic
            ? "Your profile is visible. Only enabled sections appear."
            : "Enable at least one section to make your profile visible."}
        </p>
      </Card>

      {/* section toggles */}
      {config === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Visible sections</p>
          {SECTION_META.map(({ key, label, desc, icon: Icon }) => (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <Label htmlFor={`section-${key}`} className="font-medium cursor-pointer">{label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
                <Switch
                  id={`section-${key}`}
                  checked={config.sections[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button onClick={handleSave} disabled={saving || config === null} className="w-full gap-2">
        {saved ? <><Check className="h-4 w-4" />Saved</> : saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
