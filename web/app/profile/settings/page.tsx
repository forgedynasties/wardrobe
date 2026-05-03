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
import { applyTheme, saveTheme, loadTheme, type ThemeId } from "@/lib/theme";

const THEMES: { id: ThemeId; label: string; swatches: string[] }[] = [
  { id: "",             label: "Amber",  swatches: ["#c2853a", "#f5efe8", "#e8d5be"] },
  { id: "theme-sage",   label: "Sage",   swatches: ["#3a7a52", "#edf5ef", "#c5dece"] },
  { id: "theme-mauve",  label: "Mauve",  swatches: ["#7a3a9e", "#f5edf9", "#dfc5ee"] },
  { id: "theme-ocean",  label: "Ocean",  swatches: ["#2e5fa3", "#edf2fb", "#bfd0ef"] },
  { id: "theme-clay",   label: "Clay",   swatches: ["#b84a2e", "#faf0ec", "#f0c9be"] },
  { id: "theme-noir",   label: "Noir",   swatches: ["#111111", "#f9f9f9", "#cccccc"] },
];

const SECTION_META: { key: keyof ProfileSections; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "snapshot", label: "Style Snapshot", desc: "Hangur size, categories, and color palette", icon: BarChart3 },
  { key: "outfits", label: "Outfit Gallery", desc: "Grid of outfits you've created", icon: Sparkles },
  { key: "calendar", label: "Wear Calendar", desc: "Heatmap of days you wore outfits", icon: CalendarDays },
  { key: "signature", label: "Favourites", desc: "Your most-worn clothing items", icon: Trophy },
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

  const [theme, setThemeState] = useState<ThemeId>("");

  useEffect(() => {
    if (!user) return;
    setThemeState(user.username === "alishba" ? "theme-alishba" : loadTheme(user.username));
  }, [user]);

  const pickTheme = (id: ThemeId) => {
    applyTheme(id);
    if (user) saveTheme(user.username, id);
    setThemeState(id);
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

      {/* theme picker */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Color theme</p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ id, label, swatches }) => {
            const active = theme === id;
            return (
              <button
                key={id || "default"}
                onClick={() => pickTheme(id)}
                className={`relative rounded-xl p-3 border-2 transition-all text-left ${active ? "border-primary" : "border-border hover:border-muted-foreground/40"}`}
              >
                <div className="flex gap-1 mb-2">
                  {swatches.map((c, i) => (
                    <div key={i} className="h-4 flex-1 rounded-sm first:rounded-l-md last:rounded-r-md" style={{ backgroundColor: c }} />
                  ))}
                </div>
                <p className="text-xs font-medium">{label}</p>
                {active && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving || config === null} className="w-full gap-2">
        {saved ? <><Check className="h-4 w-4" />Saved</> : saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
