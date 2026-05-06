"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLeaderboard } from "@/lib/api";
import { HangurAvatar } from "@/components/hangur-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeaderboardEntry } from "@/lib/types";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    getLeaderboard().then(setEntries).catch(() => setEntries([]));
  }, []);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {entries === null ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <Link
              key={entry.username}
              href={`/p/${entry.username}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card ring-1 ring-foreground/10 hover:ring-foreground/20 transition-all"
            >
              <div className="w-7 text-center shrink-0">
                {MEDAL[i]
                  ? <span className="text-lg">{MEDAL[i]}</span>
                  : <span className="text-sm text-muted-foreground font-mono">{i + 1}</span>}
              </div>

              <HangurAvatar colors={entry.avatar_colors} username={entry.username} size={40} />

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.display_name}</p>
                <p className="text-xs text-muted-foreground">@{entry.username}</p>
              </div>

              <div className="flex gap-4 shrink-0 text-right">
                <div>
                  <p className="text-sm font-semibold">{entry.total_wears}</p>
                  <p className="text-xs text-muted-foreground">wears</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{entry.total_items}</p>
                  <p className="text-xs text-muted-foreground">items</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{entry.total_outfits}</p>
                  <p className="text-xs text-muted-foreground">outfits</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
