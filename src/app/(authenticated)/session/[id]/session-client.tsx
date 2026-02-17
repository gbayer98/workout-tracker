"use client";

import { useState, useEffect } from "react";
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

interface SetEntry {
  liftId: string;
  setNumber: number;
  weight: number;
  reps: number;
}

interface SessionData {
  id: string;
  startedAt: string;
  workout: {
    name: string;
    workoutLifts: WorkoutLift[];
  };
  sessionSets: Array<{
    liftId: string;
    setNumber: number;
    weight: number;
    reps: number;
  }>;
}

export default function SessionClient({
  session,
  lastByLift,
}: {
  session: SessionData;
  lastByLift: Record<string, { weight: number; reps: number }>;
}) {
  const router = useRouter();
  const [sets, setSets] = useState<Record<string, SetEntry[]>>(() => {
    // Initialize from existing session sets or defaults
    const initial: Record<string, SetEntry[]> = {};
    for (const wl of session.workout.workoutLifts) {
      const existing = session.sessionSets.filter(
        (s) => s.liftId === wl.liftId
      );
      if (existing.length > 0) {
        initial[wl.liftId] = existing;
      } else {
        // Default: 1 empty set pre-populated with last values
        const last = lastByLift[wl.liftId];
        initial[wl.liftId] = [
          {
            liftId: wl.liftId,
            setNumber: 1,
            weight: last?.weight || 0,
            reps: last?.reps || 0,
          },
        ];
      }
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState("");

  // Timer
  useEffect(() => {
    const startTime = new Date(session.startedAt).getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, Date.now() - startTime);
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setElapsed(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt]);

  function updateSet(
    liftId: string,
    setIndex: number,
    field: "weight" | "reps",
    value: string
  ) {
    setSets((prev) => {
      const updated = { ...prev };
      const liftSets = [...(updated[liftId] || [])];
      liftSets[setIndex] = {
        ...liftSets[setIndex],
        [field]: field === "reps" ? parseInt(value) || 0 : parseFloat(value) || 0,
      };
      updated[liftId] = liftSets;
      return updated;
    });
  }

  function addSet(liftId: string) {
    setSets((prev) => {
      const updated = { ...prev };
      const liftSets = [...(updated[liftId] || [])];
      const lastSet = liftSets[liftSets.length - 1];
      liftSets.push({
        liftId,
        setNumber: liftSets.length + 1,
        weight: lastSet?.weight || 0,
        reps: lastSet?.reps || 0,
      });
      updated[liftId] = liftSets;
      return updated;
    });
  }

  function removeSet(liftId: string, setIndex: number) {
    setSets((prev) => {
      const updated = { ...prev };
      const liftSets = [...(updated[liftId] || [])];
      if (liftSets.length <= 1) return prev;
      liftSets.splice(setIndex, 1);
      // Re-number sets (create new objects to avoid state mutation)
      const renumbered = liftSets.map((s, i) => ({ ...s, setNumber: i + 1 }));
      updated[liftId] = renumbered;
      return updated;
    });
  }

  async function handleFinish() {
    const allSets: SetEntry[] = [];
    for (const liftSets of Object.values(sets)) {
      for (const set of liftSets) {
        if (set.weight > 0 || set.reps > 0) {
          allSets.push(set);
        }
      }
    }

    if (allSets.length === 0) {
      if (!confirm("You haven't logged any sets. Finish anyway?")) return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets: allSets, finish: true }),
      });

      if (!res.ok) {
        alert("Failed to save workout. Please try again.");
        setSaving(false);
        return;
      }

      router.push("/home");
    } catch {
      alert("Network error. Please check your connection and try again.");
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this workout? All data will be lost.")) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Failed to cancel workout. Please try again.");
        return;
      }
      router.push("/home");
    } catch {
      alert("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{session.workout.name}</h2>
          <p className="text-sm text-muted">Active Session</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-mono font-bold text-primary">{elapsed}</p>
        </div>
      </div>

      <div className="space-y-6">
        {session.workout.workoutLifts.map((wl) => {
          const liftSets = sets[wl.liftId] || [];
          const last = lastByLift[wl.liftId];

          return (
            <div
              key={wl.id}
              className="p-4 bg-card rounded-lg border border-card-border"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{wl.lift.name}</h3>
                {last && (
                  <span className="text-xs text-muted">
                    Last: {last.weight} lbs x {last.reps}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-xs text-muted">
                  <span>Set</span>
                  <span>Weight (lbs)</span>
                  <span>Reps</span>
                  <span></span>
                </div>

                {liftSets.map((set, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center"
                  >
                    <span className="text-sm text-muted text-center">
                      {set.setNumber}
                    </span>
                    <input
                      type="number"
                      value={set.weight || ""}
                      onChange={(e) =>
                        updateSet(wl.liftId, i, "weight", e.target.value)
                      }
                      placeholder="0"
                      step="2.5"
                      className="w-full px-2 py-2 rounded bg-input-bg border border-input-border text-foreground text-center text-lg focus:outline-none focus:border-primary"
                      inputMode="decimal"
                    />
                    <input
                      type="number"
                      value={set.reps || ""}
                      onChange={(e) =>
                        updateSet(wl.liftId, i, "reps", e.target.value)
                      }
                      placeholder="0"
                      className="w-full px-2 py-2 rounded bg-input-bg border border-input-border text-foreground text-center text-lg focus:outline-none focus:border-primary"
                      inputMode="numeric"
                    />
                    <button
                      onClick={() => removeSet(wl.liftId, i)}
                      className="flex items-center justify-center w-10 h-10 text-muted hover:text-danger text-sm rounded transition-colors"
                      title="Remove set"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addSet(wl.liftId)}
                className="mt-2 w-full py-1.5 text-sm text-primary hover:text-primary-hover border border-dashed border-card-border rounded transition-colors"
              >
                + Add Set
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-2 pb-4">
        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full py-3 bg-success text-white font-semibold text-lg rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving..." : "Finish Workout"}
        </button>
        <button
          onClick={handleCancel}
          className="w-full py-3 text-danger hover:text-danger-hover font-medium transition-colors"
        >
          Cancel Workout
        </button>
      </div>
    </div>
  );
}
