"use client";

import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";

export function UserGate({ children }: { children: React.ReactNode }) {
  const { user, hydrated, setUser } = useUser();

  if (!hydrated) return null;

  if (user === null) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-background px-6">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-semibold">Who's using this?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a wardrobe. You can switch anytime.
          </p>
        </div>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button size="lg" className="h-16 text-lg" onClick={() => setUser("ali")}>
            Ali
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-16 text-lg"
            onClick={() => setUser("alishba")}
          >
            Alishba
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
