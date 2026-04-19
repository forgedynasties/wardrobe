"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  variant?: "default" | "fab";
};

export function AddItemButton({ variant = "default" }: Props) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  const button =
    variant === "fab" ? (
      <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
        <Plus className="h-6 w-6" />
      </Button>
    ) : (
      <Button size="sm" className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add
      </Button>
    );

  if (user !== "alishba") {
    return <Link href="/items/new">{button}</Link>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="appearance-none border-0 bg-transparent p-0"
      >
        {button}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask Ali to add this</DialogTitle>
            <DialogDescription>
              New items need a background-free PNG. For now, Ali prepares the images and adds them
              for you. You can still log outfits freely from whatever he&apos;s already added.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
