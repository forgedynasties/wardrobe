"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type User = "ali" | "alishba";

const STORAGE_KEY = "wardrobe-user";

// Module-level ref the API fetcher reads synchronously on each request,
// so it never has to go through React to learn who's making the call.
let currentUserRef: User | null = null;

export function getCurrentUser(): User | null {
  return currentUserRef;
}

type UserContextValue = {
  user: User | null;
  hydrated: boolean;
  setUser: (u: User) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ali" || stored === "alishba") {
      setUserState(stored);
      currentUserRef = stored;
    }
    setHydrated(true);
  }, []);

  const setUser = (u: User) => {
    localStorage.setItem(STORAGE_KEY, u);
    currentUserRef = u;
    setUserState(u);
  };

  return (
    <UserContext.Provider value={{ user, hydrated, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be inside <UserProvider>");
  return ctx;
}
