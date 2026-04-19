"use client";

import { useState } from "react";
import { UserRound, ChevronsUpDown } from "lucide-react";

import { useUser, type User } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LABEL: Record<User, string> = { ali: "Ali", alishba: "Alishba" };

export function UserSwitcher() {
  const { user, setUser } = useUser();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const pick = (u: User) => {
    if (u !== user) {
      setUser(u);
      // Reload so every page refetches against the new owner scope.
      window.location.reload();
      return;
    }
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
        <span className="font-medium">{LABEL[user]}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch wardrobe</DialogTitle>
            <DialogDescription>
              Each person has their own items, outfits, and logs.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-2">
            <Button
              size="lg"
              variant={user === "ali" ? "default" : "outline"}
              onClick={() => pick("ali")}
            >
              Ali
            </Button>
            <Button
              size="lg"
              variant={user === "alishba" ? "default" : "outline"}
              onClick={() => pick("alishba")}
            >
              Alishba
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
