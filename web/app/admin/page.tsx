"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminListUsers, adminResetPassword, adminSetUserActive,
  adminSetUserAdmin, adminDeleteUser, adminRecropImages,
} from "@/lib/api";
import { useUser } from "@/lib/user-context";
import type { AuthUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Shield, RotateCcw, UserX, UserCheck, Users,
  ShieldCheck, ShieldOff, ExternalLink, Trash2,
  ImageIcon, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";

type Action = "reset-pw" | "delete" | null;

interface UserRowProps {
  u: AuthUser;
  self: AuthUser;
  onToggleActive: (username: string, active: boolean) => void;
  onToggleAdmin: (username: string, admin: boolean) => void;
  onDelete: (username: string) => void;
}

function UserRow({ u, self, onToggleActive, onToggleAdmin, onDelete }: UserRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [action, setAction] = useState<Action>(null);
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isSelf = u.username === self.username;

  const handleResetPw = async () => {
    if (newPw.length < 6) { setError("Min 6 characters"); return; }
    setSaving(true); setError("");
    try {
      await adminResetPassword(u.username, newPw);
      setAction(null); setNewPw("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminDeleteUser(u.username);
      onDelete(u.username);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setSaving(false);
    }
  };

  return (
    <Card className={`overflow-hidden transition-colors ${u.is_active === false ? "opacity-60" : ""}`}>
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{u.display_name}</span>
              <span className="text-sm text-muted-foreground">@{u.username}</span>
              {u.is_admin && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Shield className="h-3 w-3" />admin
                </Badge>
              )}
              {u.is_active === false && (
                <Badge variant="destructive" className="text-xs">disabled</Badge>
              )}
              {isSelf && (
                <Badge variant="outline" className="text-xs">you</Badge>
              )}
            </div>
            {u.created_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Joined {new Date(u.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {/* actions row */}
          <div className="flex flex-wrap gap-2">
            <Link href={`/p/${u.username}`} target="_blank">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                View profile
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setAction(action === "reset-pw" ? null : "reset-pw"); setError(""); setNewPw(""); }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset password
            </Button>

            {!isSelf && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onToggleActive(u.username, !(u.is_active ?? true))}
                >
                  {u.is_active === false
                    ? <><UserCheck className="h-3.5 w-3.5" />Enable access</>
                    : <><UserX className="h-3.5 w-3.5" />Disable access</>}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => onToggleAdmin(u.username, !u.is_admin)}
                >
                  {u.is_admin
                    ? <><ShieldOff className="h-3.5 w-3.5" />Remove admin</>
                    : <><ShieldCheck className="h-3.5 w-3.5" />Make admin</>}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => { setAction(action === "delete" ? null : "delete"); setError(""); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete account
                </Button>
              </>
            )}
          </div>

          {/* reset password inline */}
          {action === "reset-pw" && (
            <div className="flex gap-2 items-center pt-1 border-t">
              <Input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleResetPw()}
              />
              <Button size="sm" onClick={handleResetPw} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            </div>
          )}

          {/* delete confirmation */}
          {action === "delete" && (
            <div className="flex items-center gap-3 pt-1 border-t border-destructive/30 bg-destructive/5 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-sm flex-1">
                Permanently delete <strong>@{u.username}</strong> and all their data?
              </p>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting..." : "Delete"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAction(null)}>Cancel</Button>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </Card>
  );
}

export default function AdminPage() {
  const { user, hydrated } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [search, setSearch] = useState("");
  const [recropStatus, setRecropStatus] = useState<string | null>(null);
  const [recropping, setRecropping] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user?.is_admin) { router.replace("/"); return; }
    adminListUsers().then(setUsers);
  }, [hydrated, user, router]);

  const handleToggleActive = async (username: string, active: boolean) => {
    await adminSetUserActive(username, active);
    setUsers((prev) => prev?.map((u) => u.username === username ? { ...u, is_active: active } : u) ?? null);
  };

  const handleToggleAdmin = async (username: string, admin: boolean) => {
    await adminSetUserAdmin(username, admin);
    setUsers((prev) => prev?.map((u) => u.username === username ? { ...u, is_admin: admin } : u) ?? null);
  };

  const handleDelete = (username: string) => {
    setUsers((prev) => prev?.filter((u) => u.username !== username) ?? null);
  };

  const handleRecrop = async () => {
    setRecropping(true); setRecropStatus(null);
    try {
      const res = await adminRecropImages();
      setRecropStatus(`Done — ${res.cropped} cropped, ${res.failed} failed`);
    } catch (e) {
      setRecropStatus(e instanceof Error ? e.message : "Failed");
    } finally {
      setRecropping(false);
    }
  };

  if (!hydrated || !user?.is_admin) return null;

  const filtered = users?.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalActive = users?.filter((u) => u.is_active !== false).length ?? 0;
  const totalAdmins = users?.filter((u) => u.is_admin).length ?? 0;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* stats row */}
      {users !== null && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{users.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total users</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{totalActive}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{totalAdmins}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Admins</p>
          </Card>
        </div>
      )}

      {/* system tools */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">System</h2>
        <Card className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium flex items-center gap-2"><ImageIcon className="h-4 w-4" />Recrop all images</p>
            <p className="text-xs text-muted-foreground mt-0.5">Re-runs transparent crop on every processed item image for your account</p>
            {recropStatus && <p className="text-xs text-muted-foreground mt-1">{recropStatus}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={handleRecrop} disabled={recropping} className="shrink-0">
            {recropping ? "Running..." : "Run"}
          </Button>
        </Card>
      </section>

      {/* user management */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" />Users
        </h2>

        <Input
          placeholder="Search by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filtered === null || filtered === undefined ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <UserRow
                key={u.username}
                u={u}
                self={user}
                onToggleActive={handleToggleActive}
                onToggleAdmin={handleToggleAdmin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
