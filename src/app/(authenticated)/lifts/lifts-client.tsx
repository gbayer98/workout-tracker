"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LiftHistoryChart from "@/components/LiftHistoryChart";
import SanityCheckModal from "@/components/SanityCheckModal";

interface Lift {
  id: string;
  name: string;
  muscleGroup: string;
  type: "STRENGTH" | "BODYWEIGHT" | "ENDURANCE";
  perSide: boolean;
  isGlobal: boolean;
  userId: string | null;
}

const LIFT_TYPES = [
  { value: "STRENGTH", label: "Strength", desc: "Weight + Reps" },
  { value: "BODYWEIGHT", label: "Bodyweight", desc: "Reps only" },
  { value: "ENDURANCE", label: "Endurance", desc: "Time" },
] as const;

const MUSCLE_GROUPS = ["Arms", "Back", "Chest", "Core", "Legs", "Shoulders"];

export default function LiftsClient({ initialLifts }: { initialLifts: Lift[] }) {
  const [lifts, setLifts] = useState(initialLifts);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState("Chest");
  const [newType, setNewType] = useState<"STRENGTH" | "BODYWEIGHT" | "ENDURANCE">("STRENGTH");
  const [newPerSide, setNewPerSide] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sanityCheck, setSanityCheck] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [deleting, setDeleting] = useState<string | null>(null);
  const [quickLogging, setQuickLogging] = useState<string | null>(null);
  const router = useRouter();

  async function handleDeleteLift(lift: Lift) {
    if (!confirm(`Delete "${lift.name}"? This cannot be undone.`)) return;
    setDeleting(lift.id);
    try {
      const res = await fetch(`/api/lifts/${lift.id}`, { method: "DELETE" });
      if (res.ok) {
        setLifts((prev) => prev.filter((l) => l.id !== lift.id));
        if (selectedLiftId === lift.id) setSelectedLiftId(null);
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to delete lift");
      }
    } catch {
      setError("Network error — check your connection");
    }
    setDeleting(null);
  }

  async function handleQuickLog(lift: Lift) {
    setQuickLogging(lift.id);
    try {
      const res = await fetch("/api/sessions/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liftId: lift.id }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/session/${session.id}`);
      } else if (res.status === 409) {
        const data = await res.json();
        if (data.sessionId) {
          router.push(`/session/${data.sessionId}`);
        }
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to start quick log");
      }
    } catch {
      setError("Network error — check your connection");
    }
    setQuickLogging(null);
  }

  const filtered = lifts.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.muscleGroup.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Lift[]>>((acc, lift) => {
    if (!acc[lift.muscleGroup]) acc[lift.muscleGroup] = [];
    acc[lift.muscleGroup].push(lift);
    return acc;
  }, {});

  async function doCreateLift() {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/lifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), muscleGroup: newGroup, type: newType, perSide: newType === "STRENGTH" ? newPerSide : false }),
      });

      if (res.ok) {
        const lift = await res.json();
        setLifts((prev) => [...prev, lift].sort((a, b) => {
          if (a.muscleGroup !== b.muscleGroup) return a.muscleGroup.localeCompare(b.muscleGroup);
          return a.name.localeCompare(b.name);
        }));
        setNewName("");
        setShowCreate(false);
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to create lift");
      }
    } catch {
      setError("Network error — check your connection");
    }
    setCreating(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    // Check for similar existing lift names
    const trimmed = newName.trim().toLowerCase();
    const match = lifts.find(
      (l) => l.name.toLowerCase() === trimmed ||
             l.name.toLowerCase().includes(trimmed) ||
             trimmed.includes(l.name.toLowerCase())
    );
    if (match) {
      setSanityCheck({
        message: `There's already a lift called "${match.name}". Want to create "${newName.trim()}" anyway?`,
        onConfirm: () => {
          setSanityCheck(null);
          doCreateLift();
        },
      });
      return;
    }

    doCreateLift();
  }

  return (
    <div>
      {sanityCheck && (
        <SanityCheckModal
          message={sanityCheck.message}
          onConfirm={sanityCheck.onConfirm}
          onCancel={() => setSanityCheck(null)}
        />
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Lifts</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          + Add Lift
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-4 p-4 bg-card rounded-lg border border-card-border space-y-3"
        >
          <input
            type="text"
            placeholder="Lift name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
            autoFocus
          />
          <select
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
          >
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            {LIFT_TYPES.map((lt) => (
              <button
                key={lt.value}
                type="button"
                onClick={() => setNewType(lt.value)}
                className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium border transition-colors ${
                  newType === lt.value
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-input-bg border-input-border text-muted hover:text-foreground"
                }`}
              >
                <div>{lt.label}</div>
                <div className="text-xs opacity-70">{lt.desc}</div>
              </button>
            ))}
          </div>
          {newType === "STRENGTH" && (
            <label className="flex items-center gap-3 px-3 py-2 rounded-lg bg-input-bg border border-input-border cursor-pointer">
              <input
                type="checkbox"
                checked={newPerSide}
                onChange={(e) => setNewPerSide(e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <div>
                <span className="text-sm font-medium">Per side</span>
                <span className="text-xs text-muted ml-2">Weight entered is per hand/leg (e.g., 20lb dumbbells = 40lb total)</span>
              </div>
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <input
        type="text"
        placeholder="Search lifts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 mb-4 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
      />

      {Object.keys(grouped).sort().map((group) => (
        <div key={group} className="mb-4">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
            {group}
          </h3>
          <div className="space-y-1">
            {grouped[group].map((lift) => (
              <div key={lift.id}>
                <button
                  onClick={() =>
                    setSelectedLiftId(
                      selectedLiftId === lift.id ? null : lift.id
                    )
                  }
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedLiftId === lift.id
                      ? "bg-primary/20 border border-primary/40"
                      : "bg-card border border-card-border hover:border-primary/30"
                  }`}
                >
                  <span className="font-medium">{lift.name}</span>
                  {lift.perSide && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">per side</span>
                  )}
                  {lift.type !== "STRENGTH" && (
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                      lift.type === "BODYWEIGHT" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                    }`}>
                      {lift.type === "BODYWEIGHT" ? "bodyweight" : "endurance"}
                    </span>
                  )}
                  {!lift.isGlobal && (
                    <span className="ml-2 text-xs text-muted">(custom)</span>
                  )}
                </button>
                {selectedLiftId === lift.id && (
                  <div className="mt-1 mb-2">
                    <LiftHistoryChart liftId={lift.id} liftName={lift.name} liftType={lift.type} />
                    <button
                      onClick={() => handleQuickLog(lift)}
                      disabled={quickLogging === lift.id}
                      className="mt-2 w-full py-2.5 text-sm font-semibold bg-success text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {quickLogging === lift.id ? "Starting..." : `Quick Log ${lift.name}`}
                    </button>
                    {!lift.isGlobal && (
                      <button
                        onClick={() => handleDeleteLift(lift)}
                        disabled={deleting === lift.id}
                        className="mt-2 w-full py-2 text-sm text-danger hover:text-danger-hover border border-danger/30 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleting === lift.id ? "Deleting..." : "Delete Lift"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-muted text-center py-8">
          {search ? "No lifts match your search" : "No lifts available"}
        </p>
      )}
    </div>
  );
}
