"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

type Props = {
  variant?: "default" | "fab";
};

export function AddItemButton({ variant = "default" }: Props) {
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

  return <Link href="/items/new">{button}</Link>;
}
