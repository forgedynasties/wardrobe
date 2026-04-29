"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, RotateCcw, UserX, UserCheck, Users } from "lucide-react";
import { adminListUsers, adminResetPassword, adminSetUserActive } from "@/lib/api";
import { useUser } from "@/lib/user-context";
import type { AuthUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminPage() {
  const { user, hydrated } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user?.is_admin) { router.replace("/hangur"); return; }
    adminListUsers().then(setUsers);
  }, [hydrated, user, router]);

  const handleReset = async (username: string) => {
    if (!newPw || newPw.length < 6) { setError("Min 6 characters"); return; }
    setSaving(true);
    setError("");
    try {
      await adminResetPassword(username, newPw);
      setResetTarget(null);
      setNewPw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (username: string, active: boolean) => {
    await adminSetUserActive(username, active);
    setUsers((prev) => prev?.map((u) => u.username === username ? { ...u, is_active: active } : u) ?? null);
  };

  if (!hydrated || !user?.is_admin) return null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Admin</h1>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2"><Users className="h-4 w-4" />Users</h2>

        {users === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))
        ) : (
          users.map((u) => (
            <Card key={u.username} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.display_name}</span>
                    <span className="text-sm text-muted-foreground">@{u.username}</span>
                    {u.is_admin && <Badge variant="secondary" className="text-xs">admin</Badge>}
                    {u.is_active === false && <Badge variant="destructive" className="text-xs">inactive</Badge>}
                  </div>
                  {u.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {u.username !== user.username && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground"
                      onClick={() => handleToggleActive(u.username, !(u.is_active ?? true))}
                    >
                      {u.is_active === false
                        ? <><UserCheck className="h-4 w-4" /> Enable</>
                        : <><UserX className="h-4 w-4" /> Disable</>}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { setResetTarget(u.username); setNewPw(""); setError(""); }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset pw
                  </Button>
                </div>
              </div>

              {resetTarget === u.username && (
                <div className="flex gap-2 items-center pt-1 border-t">
                  <Input
                    type="password"
                    placeholder="New password (min 6 chars)"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleReset(u.username)} disabled={saving}>
                    {saving ? "..." : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setResetTarget(null)}>Cancel</Button>
                </div>
              )}
              {resetTarget === u.username && error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
