"use client";

import { useEffect, useState } from "react";

interface FeedbackItem {
  id: string;
  message: string;
  username: string;
  createdAt: string;
}

interface GroupMember {
  id: string;
  username: string;
  displayName: string | null;
}

interface GroupData {
  id: string;
  name: string;
  members: GroupMember[];
}

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
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [addUserToGroup, setAddUserToGroup] = useState<string | null>(null);

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

    fetch("/api/feedback")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        setFeedback(d);
        setFeedbackLoading(false);
      })
      .catch(() => setFeedbackLoading(false));

    fetch("/api/admin/groups")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => {
        setGroups(d);
        setGroupsLoading(false);
      })
      .catch(() => setGroupsLoading(false));
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

  async function handleCreateGroup() {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch("/api/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      if (res.ok) {
        const group = await res.json();
        setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)));
        setNewGroupName("");
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to create group");
      }
    } catch {
      alert("Network error");
    }
    setCreatingGroup(false);
  }

  async function handleDeleteGroup(groupId: string, groupName: string) {
    if (!confirm(`Delete group "${groupName}"? All memberships will be removed.`)) return;
    try {
      const res = await fetch("/api/admin/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (expandedGroup === groupId) setExpandedGroup(null);
      }
    } catch { /* silent */ }
  }

  async function handleAddUserToGroup(groupId: string, userId: string) {
    try {
      const res = await fetch("/api/admin/groups/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, userId }),
      });
      if (res.ok) {
        const user = data?.users.find((u) => u.id === userId);
        if (user) {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? { ...g, members: [...g.members, { id: user.id, username: user.username, displayName: user.displayName }] }
                : g
            )
          );
        }
        setAddUserToGroup(null);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "Failed to add user");
      }
    } catch { /* silent */ }
  }

  async function handleRemoveUserFromGroup(groupId: string, userId: string) {
    try {
      const res = await fetch("/api/admin/groups/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, userId }),
      });
      if (res.ok) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, members: g.members.filter((m) => m.id !== userId) }
              : g
          )
        );
      }
    } catch { /* silent */ }
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

      {/* User Feedback */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">
          User Feedback ({feedback.length})
        </h3>
        {feedbackLoading ? (
          <p className="text-sm text-muted">Loading feedback...</p>
        ) : feedback.length === 0 ? (
          <div className="p-4 bg-card rounded-lg border border-dashed border-card-border text-center">
            <p className="text-sm text-muted">No feedback yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-card rounded-lg border border-card-border"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.username}</span>
                  <span className="text-xs text-muted">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/80">{item.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Management */}
      <div>
        <h3 className="font-semibold mb-3">
          Groups ({groups.length})
        </h3>

        {/* Create group */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name..."
            className="flex-1 px-3 py-2 rounded-lg bg-input-bg border border-input-border text-foreground text-sm focus:outline-none focus:border-primary"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateGroup();
            }}
          />
          <button
            onClick={handleCreateGroup}
            disabled={creatingGroup || !newGroupName.trim()}
            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {creatingGroup ? "..." : "Create"}
          </button>
        </div>

        {groupsLoading ? (
          <p className="text-sm text-muted">Loading groups...</p>
        ) : groups.length === 0 ? (
          <div className="p-4 bg-card rounded-lg border border-dashed border-card-border text-center">
            <p className="text-sm text-muted">No groups yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const isExpanded = expandedGroup === group.id;
              const isAddingUser = addUserToGroup === group.id;
              const memberIds = new Set(group.members.map((m) => m.id));
              const availableUsers = data?.users.filter((u) => !memberIds.has(u.id)) || [];

              return (
                <div
                  key={group.id}
                  className="p-3 bg-card rounded-lg border border-card-border"
                >
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      <span className="text-xs text-muted">{isExpanded ? "▼" : "▶"}</span>
                      <span className="font-medium">{group.name}</span>
                      <span className="text-xs text-muted">
                        {group.members.length} {group.members.length === 1 ? "member" : "members"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      className="text-xs text-muted hover:text-danger transition-colors px-2"
                    >
                      Delete
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      {group.members.length === 0 ? (
                        <p className="text-xs text-muted pl-5">No members</p>
                      ) : (
                        group.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between pl-5 text-sm"
                          >
                            <span>
                              {member.username}
                              {member.displayName && member.displayName !== member.username && (
                                <span className="text-xs text-muted ml-1">({member.displayName})</span>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveUserFromGroup(group.id, member.id)}
                              className="text-xs text-muted hover:text-danger transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}

                      {isAddingUser ? (
                        <div className="pl-5 space-y-1 max-h-40 overflow-y-auto">
                          {availableUsers.length === 0 ? (
                            <p className="text-xs text-muted">All users are already members</p>
                          ) : (
                            availableUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleAddUserToGroup(group.id, user.id)}
                                className="w-full text-left px-2 py-1.5 text-sm rounded bg-input-bg hover:bg-primary/10 transition-colors"
                              >
                                {user.username}
                                {user.displayName && user.displayName !== user.username && (
                                  <span className="text-xs text-muted ml-1">({user.displayName})</span>
                                )}
                              </button>
                            ))
                          )}
                          <button
                            onClick={() => setAddUserToGroup(null)}
                            className="text-xs text-muted hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddUserToGroup(group.id)}
                          className="ml-5 text-xs text-primary hover:text-primary-hover transition-colors"
                        >
                          + Add user
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
