"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/user-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function apiFetch(path: string, body: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

type Mode = "login" | "register" | "otp" | "forgot" | "reset";

export function UserGate({ children }: { children: React.ReactNode }) {
  const { user, hydrated, login, initiateSignup, verifySignup } = useUser();
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>("login");

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!hydrated) return null;
  if (user || pathname.startsWith("/p/")) return <>{children}</>;

  const go = (m: Mode) => { setMode(m); setError(""); };

  const resetOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!displayName.trim()) { setError("Display name required"); return; }
    if (!email.trim()) { setError("Email required"); return; }
    setLoading(true);
    try {
      await initiateSignup(email.trim(), username.trim(), displayName.trim(), password);
      setPendingEmail(email.trim());
      resetOtp();
      go("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    setError("");
    setLoading(true);
    try {
      await verifySignup(pendingEmail, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email required"); return; }
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-password", { email: email.trim() });
      setPendingEmail(email.trim());
      resetOtp();
      setNewPassword("");
      go("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/auth/reset-password", {
        email: pendingEmail,
        code,
        new_password: newPassword,
      });
      // reset-password returns user data + sets session cookie — refresh to pick up session
      window.location.reload();
      void data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (i: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (digits.length > 0) {
      const next = ["", "", "", "", "", ""];
      digits.split("").forEach((d, i) => { next[i] = d; });
      setOtp(next);
      otpRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  const otpBoxes = (
    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
      {otp.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { otpRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleOtpInput(i, e.target.value)}
          onKeyDown={(e) => handleOtpKey(i, e)}
          className="w-11 h-14 text-center text-2xl font-bold border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      ))}
    </div>
  );

  const subtitle: Record<Mode, string> = {
    login: "Sign in to your hangur",
    register: "Create your account",
    otp: `Enter the code sent to ${pendingEmail}`,
    forgot: "Reset your password",
    reset: `Enter the code sent to ${pendingEmail}`,
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-semibold">Hangur</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle[mode]}</p>
        </div>

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => { setEmail(""); go("forgot"); }}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email</Label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-username">Username</Label>
              <Input
                id="reg-username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourhandle"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-display">Display name</Label>
              <Input
                id="reg-display"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reg-password">Password</Label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending code..." : "Continue"}
            </Button>
          </form>
        )}

        {mode === "otp" && (
          <form onSubmit={handleOtp} className="space-y-6">
            {otpBoxes}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || otp.join("").length < 6}>
              {loading ? "Verifying..." : "Verify"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Wrong email?{" "}
              <button type="button" className="underline" onClick={() => go("register")}>
                Go back
              </button>
            </p>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending code..." : "Send code"}
            </Button>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleReset} className="space-y-6">
            {otpBoxes}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || otp.join("").length < 6}>
              {loading ? "Resetting..." : "Reset password"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Wrong email?{" "}
              <button type="button" className="underline" onClick={() => go("forgot")}>
                Go back
              </button>
            </p>
          </form>
        )}

        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>No account?{" "}
                <button className="underline" onClick={() => go("register")}>Sign up</button>
              </>
            ) : mode === "register" ? (
              <>Already have an account?{" "}
                <button className="underline" onClick={() => go("login")}>Sign in</button>
              </>
            ) : (
              <>Remember it?{" "}
                <button className="underline" onClick={() => go("login")}>Sign in</button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
