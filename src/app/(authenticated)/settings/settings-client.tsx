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

  // Groups
  const [groups, setGroups] = useState<{ id: string; name: string; memberCount: number; isMember: boolean }[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [savingGroups, setSavingGroups] = useState(false);
  const [groupMsg, setGroupMsg] = useState<{ text: string; ok: boolean } | null>(null);

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

    fetch("/api/groups")
      .then((r) => r.ok ? r.json() : [])
      .then((data: { id: string; name: string; memberCount: number; isMember: boolean }[]) => {
        setGroups(data);
        setSelectedGroups(new Set(data.filter((g) => g.isMember).map((g) => g.id)));
      })
      .catch(() => {});
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

  function toggleGroup(id: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setGroupMsg(null);
  }

  async function handleSaveGroups() {
    if (selectedGroups.size === 0) {
      setGroupMsg({ text: "You must be in at least one group", ok: false });
      return;
    }
    setSavingGroups(true);
    setGroupMsg(null);

    const res = await fetch("/api/groups", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds: Array.from(selectedGroups) }),
    });

    if (res.ok) {
      setGroupMsg({ text: "Groups updated!", ok: true });
    } else {
      setGroupMsg({ text: "Failed to update groups", ok: false });
    }
    setSavingGroups(false);
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

      {/* Groups */}
      {groups.length > 0 && (
        <div className="mb-6 p-4 bg-card rounded-lg border border-card-border space-y-3">
          <h3 className="font-semibold">My Groups</h3>
          <p className="text-xs text-muted">
            Groups determine who you see on the leaderboard.
          </p>
          <div className="space-y-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => toggleGroup(g.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedGroups.has(g.id)
                    ? "bg-primary/10 border-primary/40"
                    : "bg-input-bg border-input-border hover:border-card-border"
                }`}
              >
                <div className="text-left">
                  <p className="font-medium text-sm">{g.name}</p>
                  <p className="text-xs text-muted">
                    {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedGroups.has(g.id)
                      ? "bg-primary border-primary"
                      : "border-input-border"
                  }`}
                >
                  {selectedGroups.has(g.id) && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
          {groupMsg && (
            <p className={`text-sm ${groupMsg.ok ? "text-success" : "text-danger"}`}>
              {groupMsg.text}
            </p>
          )}
          <button
            onClick={handleSaveGroups}
            disabled={savingGroups}
            className="w-full py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {savingGroups ? "Saving..." : "Save Groups"}
          </button>
        </div>
      )}

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
