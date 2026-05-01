"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserSwitcher } from "@/components/user-switcher";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-lg">
      <Link href="/" className="flex items-center gap-1.5 hover:opacity-75 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
          <path fill="currentColor" d="M26 7v4h-4v14h-12v-14h-4v-4h8v4h4v-4h8z"/>
        </svg>
        <span className="font-heading text-sm font-semibold tracking-tight">Hangur</span>
      </Link>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <UserSwitcher />
      </div>
    </header>
  );
}
