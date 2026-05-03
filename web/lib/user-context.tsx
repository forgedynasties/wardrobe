"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface AuthUser {
  username: string;
  display_name: string;
  is_admin: boolean;
  is_active?: boolean;
  created_at?: string;
}

type AuthContextValue = {
  user: AuthUser | null;
  hydrated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string) => Promise<void>;
  initiateSignup: (email: string, username: string, displayName: string, password: string) => Promise<void>;
  verifySignup: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers as object) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
  return body;
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setHydrated(true));
  }, []);

  // Apply per-user theme class
  useEffect(() => {
    const root = document.documentElement;
    if (user?.username === "alishba") root.classList.add("theme-alishba");
    else root.classList.remove("theme-alishba");
  }, [user]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data);
  }, []);

  const register = useCallback(async (username: string, displayName: string, password: string) => {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, display_name: displayName, password }),
    });
    setUser(data);
  }, []);

  const initiateSignup = useCallback(async (email: string, username: string, displayName: string, password: string) => {
    await apiFetch("/api/auth/signup/initiate", {
      method: "POST",
      body: JSON.stringify({ email, username, display_name: displayName, password }),
    });
  }, []);

  const verifySignup = useCallback(async (email: string, code: string) => {
    const data = await apiFetch("/api/auth/signup/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, hydrated, login, register, initiateSignup, verifySignup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useUser(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useUser must be inside <UserProvider>");
  return ctx;
}

// Legacy compat — getCurrentUser still works for api.ts fetcher
// (now returns username string, used as owner in X-User header which we've removed,
//  but kept to avoid breaking other potential callers)
export function getCurrentUser(): string | null {
  return null; // cookie-based now, no need to pass header
}
