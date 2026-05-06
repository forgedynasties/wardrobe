"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Shirt, CalendarDays, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/user-context";

const navItems = [
  { href: "/", label: "Explore", icon: Globe },
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/logger", label: "Calendar", icon: CalendarDays },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User },
];

function GuestBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-chrome/90 backdrop-blur-lg text-chrome-foreground">
      <div className="flex items-center justify-between h-16 max-w-sm mx-auto px-6 gap-4">
        <div>
          <p className="text-sm font-semibold">Hangur</p>
          <p className="text-xs text-muted-foreground">Track what you wear</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href="/login"
            className="px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Sign up free
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const { user } = useUser();

  const publicPaths = ["/p/", "/leaderboard"];
  if ((publicPaths.some((p) => pathname.startsWith(p)) || pathname === "/") && !user) {
    return <GuestBar />;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-chrome/90 backdrop-blur-lg text-chrome-foreground">
      <div className="flex items-center justify-around h-16 max-w-3xl mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/profile" && !!user && pathname === `/p/${user.username}`) ||
            (item.href === "/wardrobe" && (pathname.startsWith("/items/") || pathname.startsWith("/outfits/")));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors relative min-w-0",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
