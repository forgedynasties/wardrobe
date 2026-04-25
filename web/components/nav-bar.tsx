"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shirt, Sparkles, CalendarDays, BarChart3, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/wardrobe", label: "Wardrobe", icon: Shirt },
  { href: "/outfits", label: "Outfits", icon: Sparkles },
  { href: "/logger", label: "Logger", icon: CalendarDays },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/80 backdrop-blur-lg">
      <div className="flex items-center justify-around h-16 max-w-3xl mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
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
