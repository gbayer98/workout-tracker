"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live username availability check
  useEffect(() => {
    if (checkTimeout.current) clearTimeout(checkTimeout.current);

    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameStatus(trimmed.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    checkTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/check-username?username=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    }, 400);
  }, [username]);

  function getPasswordStrength(): { label: string; color: string } | null {
    if (password.length === 0) return null;
    if (password.length < 8) return { label: "Too short", color: "text-danger" };
    if (password.length < 12) return { label: "OK", color: "text-amber-400" };
    return { label: "Strong", color: "text-success" };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is taken");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const signInResult = await signIn("credentials", {
        username: username.trim(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but login failed. Please sign in.");
        setLoading(false);
        router.push("/login");
        return;
      }

      router.push("/home");
    } catch {
      setError("Network error — check your connection");
      setLoading(false);
    }
  }

  const strength = getPasswordStrength();

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2">
          Workout Tracker
        </h1>
        <p className="text-center text-muted mb-8">Create your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-muted mb-1"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input-bg border border-input-border text-foreground text-lg focus:outline-none focus:border-primary"
              autoComplete="username"
              autoFocus
              required
              maxLength={20}
            />
            <div className="mt-1 h-5">
              {usernameStatus === "checking" && (
                <p className="text-xs text-muted">Checking...</p>
              )}
              {usernameStatus === "available" && (
                <p className="text-xs text-success">Available</p>
              )}
              {usernameStatus === "taken" && (
                <p className="text-xs text-danger">Already taken</p>
              )}
              {usernameStatus === "invalid" && (
                <p className="text-xs text-danger">
                  3-20 characters, letters/numbers/underscores only
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-muted mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input-bg border border-input-border text-foreground text-lg focus:outline-none focus:border-primary"
              autoComplete="new-password"
              required
              minLength={8}
            />
            {strength && (
              <p className={`text-xs mt-1 ${strength.color}`}>
                {strength.label}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-muted mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-input-bg border border-input-border text-foreground text-lg focus:outline-none focus:border-primary"
              autoComplete="new-password"
              required
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className="text-xs text-danger mt-1">
                Passwords don&apos;t match
              </p>
            )}
          </div>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || usernameStatus === "taken" || usernameStatus === "invalid"}
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
