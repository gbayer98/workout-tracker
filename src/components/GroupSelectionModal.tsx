"use client";

import { useEffect, useState } from "react";

interface GroupOption {
  id: string;
  name: string;
  memberCount: number;
  isMember: boolean;
}

export default function GroupSelectionModal({
  onDone,
}: {
  onDone: () => void;
}) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((data: GroupOption[]) => {
        setGroups(data);
        // Pre-select groups user is already in
        const alreadyIn = new Set(
          data.filter((g) => g.isMember).map((g) => g.id)
        );
        // If user is in no groups yet, pre-select all
        if (alreadyIn.size === 0) {
          setSelected(new Set(data.map((g) => g.id)));
        } else {
          setSelected(alreadyIn);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        onDone();
      });
  }, [onDone]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSave() {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupIds: Array.from(selected) }),
      });
      if (res.ok) {
        localStorage.setItem("hasSelectedGroups", "true");
        onDone();
      }
    } catch {
      // silently fail
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-card-border w-full max-w-sm p-6 text-center">
          <p className="text-muted">Loading groups...</p>
        </div>
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl border border-card-border w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-center mb-2">Join a Group</h2>
        <p className="text-sm text-muted text-center mb-5">
          Groups determine who you see on the leaderboard. You can change this
          anytime in Settings.
        </p>

        <div className="space-y-2 mb-5">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => toggle(g.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                selected.has(g.id)
                  ? "bg-primary/10 border-primary/40"
                  : "bg-input-bg border-input-border hover:border-card-border"
              }`}
            >
              <div className="text-left">
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-muted">
                  {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                </p>
              </div>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  selected.has(g.id)
                    ? "bg-primary border-primary"
                    : "border-input-border"
                }`}
              >
                {selected.has(g.id) && (
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

        <button
          onClick={handleSave}
          disabled={saving || selected.size === 0}
          className="w-full py-2.5 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
