"use client";

import { useEffect, useState } from "react";

interface AdminData {
  stats: {
    totalUsers: number;
    weeklyActiveUsers: number;
    totalWorkoutsCompleted: number;
    workoutsThisWeek: number;
    totalMassMoved: number;
    topLifts: Array<{ name: string; sets: number }>;
  };
  users: Array<{
    id: string;
    username: string;
    displayName: string | null;
    role: string;
    createdAt: string;
    lastActiveAt: string;
    workouts: number;
  }>;
}

function formatMass(lbs: number): string {
  if (lbs >= 1_000_000) return `${(lbs / 1_000_000).toFixed(1)}M`;
  if (lbs >= 1000) return `${(lbs / 1000).toFixed(1)}k`;
  return lbs.toLocaleString();
}

export default function AdminClient() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleResetPassword(userId: string) {
    if (!resetPassword || resetPassword.length < 8) {
      setResetMsg("Password must be at least 8 characters");
      return;
    }

    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, newPassword: resetPassword }),
    });

    if (res.ok) {
      setResetMsg("Password reset!");
      setResetPassword("");
      setTimeout(() => {
        setResetTarget(null);
        setResetMsg(null);
      }, 1500);
    } else {
      const data = await res.json().catch(() => null);
      setResetMsg(data?.error || "Failed to reset");
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Loading admin dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-danger">Failed to load admin data</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Admin Dashboard</h2>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Total Users" value={data.stats.totalUsers.toString()} />
        <StatCard
          label="Active This Week"
          value={data.stats.weeklyActiveUsers.toString()}
        />
        <StatCard
          label="Workouts (All Time)"
          value={data.stats.totalWorkoutsCompleted.toString()}
        />
        <StatCard
          label="Workouts (7d)"
          value={data.stats.workoutsThisWeek.toString()}
        />
        <StatCard
          label="Mass Moved (All)"
          value={`${formatMass(data.stats.totalMassMoved)} lbs`}
        />
        <StatCard
          label="Avg Workouts/User"
          value={
            data.stats.totalUsers > 0
              ? (
                  data.stats.totalWorkoutsCompleted / data.stats.totalUsers
                ).toFixed(1)
              : "0"
          }
        />
      </div>

      {/* Popular lifts */}
      {data.stats.topLifts.length > 0 && (
        <div className="mb-6 p-4 bg-card rounded-lg border border-card-border">
          <h3 className="font-semibold mb-3">Most Popular Lifts</h3>
          <div className="space-y-2">
            {data.stats.topLifts.map((lift, i) => (
              <div
                key={lift.name}
                className="flex items-center justify-between text-sm"
              >
                <span>
                  <span className="text-muted mr-2">#{i + 1}</span>
                  {lift.name}
                </span>
                <span className="text-muted">{lift.sets} sets</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User list */}
      <div className="mb-4">
        <h3 className="font-semibold mb-3">
          Users ({data.users.length})
        </h3>
        <div className="space-y-2">
          {data.users.map((user) => (
            <div
              key={user.id}
              className="p-3 bg-card rounded-lg border border-card-border"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user.username}</span>
                  {user.displayName &&
                    user.displayName !== user.username && (
                      <span className="text-xs text-muted">
                        ({user.displayName})
                      </span>
                    )}
                  {user.role === "ADMIN" && (
                    <span className="text-xs px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded">
                      admin
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium">
                  {user.workouts} workouts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Joined {user.createdAt}</span>
                <span>Last active {user.lastActiveAt}</span>
              </div>

              {/* Reset password */}
              {resetTarget === user.id ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="New password (8+ chars)"
                    className="flex-1 px-2 py-1.5 rounded bg-input-bg border border-input-border text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => handleResetPassword(user.id)}
                    className="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setResetTarget(null);
                      setResetMsg(null);
                      setResetPassword("");
                    }}
                    className="px-2 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setResetTarget(user.id);
                    setResetMsg(null);
                    setResetPassword("");
                  }}
                  className="mt-2 text-xs text-muted hover:text-foreground transition-colors"
                >
                  Reset password
                </button>
              )}
              {resetTarget === user.id && resetMsg && (
                <p
                  className={`text-xs mt-1 ${
                    resetMsg.includes("reset!") ? "text-success" : "text-danger"
                  }`}
                >
                  {resetMsg}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-card rounded-xl border border-card-border">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
