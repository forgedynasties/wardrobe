"use client";

import { useState } from "react";
import { UserRound, LogOut } from "lucide-react";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function UserSwitcher() {
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    setOpen(false);
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user.display_name}</DialogTitle>
            <DialogDescription>@{user.username}{user.is_admin ? " · admin" : ""}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={loading}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {loading ? "Signing out..." : "Sign out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
