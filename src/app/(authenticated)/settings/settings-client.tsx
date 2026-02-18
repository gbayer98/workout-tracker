"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";

export default function SettingsClient() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [loading, setLoading] = useState(true);

  // Display name form
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data) => {
        setUsername(data.username);
        setDisplayName(data.displayName || "");
        setMemberSince(
          new Date(data.createdAt).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });

    if (res.ok) {
      setNameMsg({ text: "Display name updated!", ok: true });
    } else {
      const data = await res.json().catch(() => null);
      setNameMsg({ text: data?.error || "Failed to update", ok: false });
    }
    setSavingName(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 8) {
      setPwMsg({ text: "New password must be at least 8 characters", ok: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ text: "Passwords don't match", ok: false });
      return;
    }

    setSavingPw(true);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    if (res.ok) {
      setPwMsg({ text: "Password changed!", ok: true });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json().catch(() => null);
      setPwMsg({ text: data?.error || "Failed to change password", ok: false });
    }
    setSavingPw(false);
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      {/* Account info */}
      <div className="mb-6 p-4 bg-card rounded-lg border border-card-border">
        <p className="text-sm text-muted mb-1">Username</p>
        <p className="font-medium text-lg">{username}</p>
        <p className="text-xs text-muted mt-2">Member since {memberSince}</p>
      </div>

      {/* Display name */}
      <form
        onSubmit={handleSaveName}
        className="mb-6 p-4 bg-card rounded-lg border border-card-border space-y-3"
      >
        <h3 className="font-semibold">Leaderboard Display Name</h3>
        <p className="text-xs text-muted">
          This is how your name appears on the leaderboard. Leave blank to use
          your username.
        </p>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={username}
          maxLength={30}
          className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
        />
        {nameMsg && (
          <p
            className={`text-sm ${
              nameMsg.ok ? "text-success" : "text-danger"
            }`}
          >
            {nameMsg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={savingName}
          className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {savingName ? "Saving..." : "Save Display Name"}
        </button>
      </form>

      {/* Change password */}
      <form
        onSubmit={handleChangePassword}
        className="mb-6 p-4 bg-card rounded-lg border border-card-border space-y-3"
      >
        <h3 className="font-semibold">Change Password</h3>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
          autoComplete="current-password"
          required
        />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
          autoComplete="new-password"
          required
        />
        {pwMsg && (
          <p
            className={`text-sm ${
              pwMsg.ok ? "text-success" : "text-danger"
            }`}
          >
            {pwMsg.text}
          </p>
        )}
        <button
          type="submit"
          disabled={savingPw}
          className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {savingPw ? "Changing..." : "Change Password"}
        </button>
      </form>

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full py-3 bg-danger/10 text-danger font-medium rounded-lg border border-danger/30 hover:bg-danger/20 transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
