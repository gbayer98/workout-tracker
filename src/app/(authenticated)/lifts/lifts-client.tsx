"use client";

import { useState } from "react";
import LiftHistoryChart from "@/components/LiftHistoryChart";
import SanityCheckModal from "@/components/SanityCheckModal";

interface Lift {
  id: string;
  name: string;
  muscleGroup: string;
  type: "STRENGTH" | "BODYWEIGHT" | "ENDURANCE";
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
  const [creating, setCreating] = useState(false);
  const [selectedLiftId, setSelectedLiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sanityCheck, setSanityCheck] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
        body: JSON.stringify({ name: newName.trim(), muscleGroup: newGroup, type: newType }),
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
