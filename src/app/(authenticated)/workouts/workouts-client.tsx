"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Lift {
  id: string;
  name: string;
  muscleGroup: string;
}

interface WorkoutLift {
  id: string;
  liftId: string;
  order: number;
  lift: Lift;
}

interface Workout {
  id: string;
  name: string;
  workoutLifts: WorkoutLift[];
}

interface ActiveSession {
  id: string;
  workoutId: string | null;
  workoutName: string;
  startedAt: string;
  setCount: number;
}

interface HistorySession {
  id: string;
  workoutId: string | null;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  setCount: number;
}

export default function WorkoutsClient({
  initialWorkouts,
  availableLifts,
  activeSession,
  sessionHistory,
}: {
  initialWorkouts: Workout[];
  availableLifts: Lift[];
  activeSession: ActiveSession | null;
  sessionHistory: HistorySession[];
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [selectedLiftIds, setSelectedLiftIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allLifts, setAllLifts] = useState(availableLifts);
  const [showNewLift, setShowNewLift] = useState(false);
  const [newLiftName, setNewLiftName] = useState("");
  const [newLiftMuscleGroup, setNewLiftMuscleGroup] = useState("Arms");
  const [newLiftType, setNewLiftType] = useState<"STRENGTH" | "BODYWEIGHT" | "ENDURANCE">("STRENGTH");
  const [newLiftPerSide, setNewLiftPerSide] = useState(false);
  const [creatingLift, setCreatingLift] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const router = useRouter();

  function openCreate() {
    setEditingId(null);
    setFormName("");
    setSelectedLiftIds([]);
    setShowForm(true);
    setShowTemplates(true);
  }

  function openEdit(workout: Workout) {
    setEditingId(workout.id);
    setFormName(workout.name);
    setSelectedLiftIds(workout.workoutLifts.map((wl) => wl.liftId));
    setShowForm(true);
    setShowTemplates(true);
  }

  function toggleLift(liftId: string) {
    setSelectedLiftIds((prev) =>
      prev.includes(liftId)
        ? prev.filter((id) => id !== liftId)
        : [...prev, liftId]
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || selectedLiftIds.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/workouts/${editingId}` : "/api/workouts";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), liftIds: selectedLiftIds }),
      });

      if (res.ok) {
        const workout = await res.json();
        if (editingId) {
          setWorkouts((prev) => prev.map((w) => (w.id === editingId ? workout : w)));
        } else {
          setWorkouts((prev) => [workout, ...prev]);
        }
        setShowForm(false);
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to save workout");
      }
    } catch {
      setError("Network error — check your connection");
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workout? Your completed session history will be preserved.")) return;
    try {
      const res = await fetch(`/api/workouts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
      } else {
        alert("Failed to delete workout. Please try again.");
      }
    } catch {
      alert("Network error. Please check your connection.");
    }
  }

  async function handleStart(workoutId: string) {
    if (activeSession) {
      router.push(`/session/${activeSession.id}`);
      return;
    }
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workoutId }),
    });

    if (res.ok) {
      const session = await res.json();
      router.push(`/session/${session.id}`);
    } else if (res.status === 409) {
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      }
    }
  }

  async function handleCreateLift() {
    if (!newLiftName.trim()) return;
    setCreatingLift(true);
    try {
      const res = await fetch("/api/lifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLiftName.trim(),
          muscleGroup: newLiftMuscleGroup,
          type: newLiftType,
          perSide: newLiftType === "STRENGTH" ? newLiftPerSide : false,
        }),
      });
      if (res.ok) {
        const lift = await res.json();
        setAllLifts((prev) => [...prev, lift]);
        setSelectedLiftIds((prev) => [...prev, lift.id]);
        setShowNewLift(false);
        setNewLiftName("");
        setNewLiftType("STRENGTH");
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to create lift");
      }
    } catch {
      setError("Network error creating lift");
    }
    setCreatingLift(false);
  }

  function formatDuration(start: string, end: string): string {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function formatElapsed(start: string): string {
    const ms = Date.now() - new Date(start).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just started";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  }

  const MUSCLE_GROUPS = ["Arms", "Back", "Chest", "Core", "Legs", "Shoulders"];

  const liftsByGroup = allLifts.reduce<Record<string, Lift[]>>((acc, lift) => {
    if (!acc[lift.muscleGroup]) acc[lift.muscleGroup] = [];
    acc[lift.muscleGroup].push(lift);
    return acc;
  }, {});

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Active Session Banner */}
      {activeSession && (
        <button
          onClick={() => router.push(`/session/${activeSession.id}`)}
          className="w-full mb-4 p-4 bg-success/15 border-2 border-success/40 rounded-xl text-left transition-colors hover:bg-success/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 bg-success rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-success uppercase tracking-wide">Active Session</span>
              </div>
              <p className="font-bold text-lg">{activeSession.workoutName}</p>
              <p className="text-sm text-muted">
                Started {formatElapsed(activeSession.startedAt)} &middot; {activeSession.setCount} sets logged
              </p>
            </div>
            <div className="text-success font-semibold text-sm bg-success/20 px-3 py-1.5 rounded-lg">
              Resume &rarr;
            </div>
          </div>
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Workouts</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-3 py-2 text-sm text-muted hover:text-foreground border border-card-border rounded-lg transition-colors"
          >
            {showTemplates ? "Hide Templates" : "Templates"}
          </button>
          <button
            onClick={openCreate}
            className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-4 p-4 bg-card rounded-lg border border-card-border space-y-3"
        >
          <input
            type="text"
            placeholder="Workout name (e.g., Arms, Push Day)"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
            autoFocus
          />

          <p className="text-sm text-muted">Select lifts:</p>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {Object.keys(liftsByGroup).sort().map((group) => (
              <div key={group}>
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                  {group}
                </p>
                {liftsByGroup[group].map((lift) => (
                  <label
                    key={lift.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-input-bg cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLiftIds.includes(lift.id)}
                      onChange={() => toggleLift(lift.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm">{lift.name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          {/* Selected lift order */}
          {selectedLiftIds.length > 1 && (
            <div>
              <p className="text-sm text-muted mb-1">Lift order:</p>
              <div className="space-y-1">
                {selectedLiftIds.map((id, i) => {
                  const lift = allLifts.find((l) => l.id === id);
                  if (!lift) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center gap-2 px-2 py-1.5 bg-input-bg rounded"
                    >
                      <span className="text-xs text-muted w-5 text-center">{i + 1}</span>
                      <span className="text-sm flex-1">{lift.name}</span>
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          setSelectedLiftIds((prev) => {
                            const next = [...prev];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            return next;
                          });
                        }}
                        className="px-1.5 py-0.5 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        &#9650;
                      </button>
                      <button
                        type="button"
                        disabled={i === selectedLiftIds.length - 1}
                        onClick={() => {
                          setSelectedLiftIds((prev) => {
                            const next = [...prev];
                            [next[i], next[i + 1]] = [next[i + 1], next[i]];
                            return next;
                          });
                        }}
                        className="px-1.5 py-0.5 text-xs text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        &#9660;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inline new lift creation */}
          {!showNewLift ? (
            <button
              type="button"
              onClick={() => setShowNewLift(true)}
              className="w-full py-2 text-sm text-primary hover:text-primary-hover border border-dashed border-card-border rounded-lg transition-colors"
            >
              + Create New Lift
            </button>
          ) : (
            <div className="p-3 bg-input-bg rounded-lg border border-input-border space-y-2">
              <input
                type="text"
                placeholder="Lift name (e.g., Cable Fly)"
                value={newLiftName}
                onChange={(e) => setNewLiftName(e.target.value)}
                className="w-full px-3 py-2 rounded bg-card border border-card-border text-foreground text-sm focus:outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex gap-2">
                <select
                  value={newLiftMuscleGroup}
                  onChange={(e) => setNewLiftMuscleGroup(e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded bg-card border border-card-border text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  {MUSCLE_GROUPS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={newLiftType}
                  onChange={(e) => setNewLiftType(e.target.value as "STRENGTH" | "BODYWEIGHT" | "ENDURANCE")}
                  className="flex-1 px-2 py-1.5 rounded bg-card border border-card-border text-foreground text-sm focus:outline-none focus:border-primary"
                >
                  <option value="STRENGTH">Strength</option>
                  <option value="BODYWEIGHT">Bodyweight</option>
                  <option value="ENDURANCE">Endurance</option>
                </select>
              </div>
              {newLiftType === "STRENGTH" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newLiftPerSide}
                    onChange={(e) => setNewLiftPerSide(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary"
                  />
                  <span className="text-xs text-muted">Per side (dumbbell/unilateral)</span>
                </label>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateLift}
                  disabled={creatingLift || !newLiftName.trim()}
                  className="flex-1 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {creatingLift ? "Creating..." : "Add Lift"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewLift(false);
                    setNewLiftName("");
                  }}
                  className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !formName.trim() || selectedLiftIds.length === 0}
              className="flex-1 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Workout Templates (collapsible) */}
      {showTemplates && !showForm && (
        <div className="mb-6 space-y-3">
          {workouts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted text-sm">No workout templates yet. Create one to get started.</p>
            </div>
          ) : (
            workouts.map((workout) => {
              const isActive = activeSession?.workoutId === workout.id;
              return (
                <div
                  key={workout.id}
                  className="p-4 bg-card rounded-lg border border-card-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{workout.name}</h3>
                    <span className="text-sm text-muted">
                      {workout.workoutLifts.length} lifts
                    </span>
                  </div>

                  <p className="text-sm text-muted mb-3">
                    {workout.workoutLifts.map((wl) => wl.lift.name).join(", ")}
                  </p>

                  <div className="flex gap-2">
                    {isActive ? (
                      <button
                        onClick={() => router.push(`/session/${activeSession.id}`)}
                        className="flex-1 py-2 bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Resume Workout
                      </button>
                    ) : activeSession ? (
                      <button
                        disabled
                        className="flex-1 py-2 bg-card text-muted font-medium rounded-lg border border-card-border opacity-50 cursor-not-allowed"
                      >
                        Session In Progress...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(workout.id)}
                        className="flex-1 py-2 bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Start Workout
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(workout)}
                      className="px-3 py-2 text-sm text-muted hover:text-foreground border border-card-border rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(workout.id)}
                      className="px-3 py-2 text-sm text-danger hover:text-danger-hover border border-card-border rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Session History */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Session History</h3>
        {sessionHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted text-sm">No completed sessions yet. Start a workout to begin tracking.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessionHistory.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-card rounded-lg border border-card-border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{s.workoutName}</p>
                    <p className="text-sm text-muted">
                      {formatDate(s.finishedAt)} &middot; {formatDuration(s.startedAt, s.finishedAt)} &middot; {s.setCount} sets
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/session/${s.id}`)}
                    className="flex-1 py-1.5 text-sm text-muted hover:text-foreground border border-card-border rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  {s.workoutId && !activeSession ? (
                    <button
                      onClick={() => handleStart(s.workoutId!)}
                      className="flex-1 py-1.5 text-sm bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Repeat
                    </button>
                  ) : s.workoutId && activeSession ? (
                    <button
                      disabled
                      className="flex-1 py-1.5 text-sm text-muted border border-card-border rounded-lg opacity-50 cursor-not-allowed"
                    >
                      Session Active
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
