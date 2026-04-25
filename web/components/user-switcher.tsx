"use client";

import { useState, useEffect } from "react";
import { UserRound, LogOut, KeyRound, Bell, BellOff, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { changePassword } from "@/lib/api";
import { useOutfitReminder } from "@/components/outfit-reminder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type View = "main" | "change-password";

export function UserSwitcher() {
  const { user, logout } = useUser();
  const router = useRouter();
  const { isEnabled, enable, disable } = useOutfitReminder();
  const [reminderOn, setReminderOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [loading, setLoading] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setReminderOn(isEnabled());
  }, [open]);

  if (!user) return null;

  const handleToggleReminder = async () => {
    if (reminderOn) {
      disable();
      setReminderOn(false);
    } else {
      const result = await enable();
      setReminderOn(result === "granted");
    }
  };

  const handleClose = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setView("main");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setError(""); setSuccess(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    setOpen(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setSuccess(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-2 px-2 text-xs"
        onClick={() => setOpen(true)}
      >
        <UserRound className="h-4 w-4" />
        <span className="font-medium">{user.display_name}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user.display_name}</DialogTitle>
            <DialogDescription>@{user.username}{user.is_admin ? " · admin" : ""}</DialogDescription>
          </DialogHeader>

          {view === "main" && (
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { setOpen(false); router.push("/profile"); }}
              >
                <User className="h-4 w-4" />
                Profile settings
              </Button>
              {user.is_admin && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => { setOpen(false); router.push("/admin"); }}
                >
                  <Shield className="h-4 w-4" />
                  Admin panel
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleToggleReminder}
              >
                {reminderOn ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {reminderOn ? "Disable daily reminder" : "Enable daily reminder"}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => { setView("change-password"); setSuccess(false); setError(""); }}
              >
                <KeyRound className="h-4 w-4" />
                Change password
              </Button>
              <Button
                variant="destructive"
                onClick={handleLogout}
                disabled={loading}
                className="w-full gap-2"
              >
                <LogOut className="h-4 w-4" />
                {loading ? "Signing out..." : "Sign out"}
              </Button>
            </DialogFooter>
          )}

          {view === "change-password" && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {success ? (
                <p className="text-sm text-green-600">Password changed successfully.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="current-pw">Current password</Label>
                    <Input
                      id="current-pw"
                      type="password"
                      autoComplete="current-password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-pw">New password</Label>
                    <Input
                      id="new-pw"
                      type="password"
                      autoComplete="new-password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-pw">Confirm new password</Label>
                    <Input
                      id="confirm-pw"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </>
              )}
              <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setView("main")}>
                  Back
                </Button>
                {!success && (
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
