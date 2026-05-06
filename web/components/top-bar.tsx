"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserSwitcher } from "@/components/user-switcher";
import { Button } from "@/components/ui/button";

export function TopBar() {

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between bg-background/80 px-4 backdrop-blur-lg">
      <Link href="/" className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
          <path fill="currentColor" d="M26 7v4h-4v14h-12v-14h-4v-4h8v4h4v-4h8z"/>
        </svg>
        <span className="font-heading text-sm font-semibold tracking-tight">Hangur</span>
      </Link>
      <div className="flex items-center gap-1">
        <Link href="/leaderboard">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Leaderboard">
            <Trophy className="h-4 w-4" />
          </Button>
        </Link>
        <ThemeToggle />
        <UserSwitcher />
      </div>
    </header>
  );
}
