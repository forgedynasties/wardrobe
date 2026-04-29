"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserSwitcher } from "@/components/user-switcher";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-lg">
      <span className="font-heading text-sm font-semibold tracking-tight">Hangur</span>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserSwitcher />
      </div>
    </header>
  );
}
