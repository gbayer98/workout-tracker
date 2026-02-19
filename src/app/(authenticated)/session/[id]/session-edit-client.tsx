"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Lift {
  id: string;
  name: string;
  muscleGroup: string;
  type: "STRENGTH" | "BODYWEIGHT" | "ENDURANCE";
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
  duration?: number;
}

interface SessionData {
  id: string;
  startedAt: string;
  finishedAt: string;
  workout: {
    name: string;
    workoutLifts: WorkoutLift[];
  };
  sessionSets: Array<{
    liftId: string;
    setNumber: number;
    weight: number;
    reps: number;
    duration?: number;
  }>;
}

export default function SessionEditClient({
  session,
}: {
  session: SessionData;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sets, setSets] = useState<Record<string, SetEntry[]>>(() => {
    const initial: Record<string, SetEntry[]> = {};
    for (const wl of session.workout.workoutLifts) {
      const existing = session.sessionSets.filter(
        (s) => s.liftId === wl.liftId
      );
      initial[wl.liftId] = existing.length > 0
        ? existing
        : [{ liftId: wl.liftId, setNumber: 1, weight: 0, reps: 0 }];
    }
    return initial;
  });

  const startedAt = new Date(session.startedAt);
  const finishedAt = new Date(session.finishedAt);
  const durationMin = Math.round(
    (finishedAt.getTime() - startedAt.getTime()) / 60000
  );
  const dateStr = startedAt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  function updateSet(
    liftId: string,
    setIndex: number,
    field: "weight" | "reps" | "duration",
    value: string
  ) {
    setSets((prev) => {
      const updated = { ...prev };
      const liftSets = [...(updated[liftId] || [])];
      liftSets[setIndex] = {
        ...liftSets[setIndex],
        [field]: field === "weight" ? parseFloat(value) || 0 : parseInt(value) || 0,
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
      const renumbered = liftSets.map((s, i) => ({ ...s, setNumber: i + 1 }));
      updated[liftId] = renumbered;
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);
    const allSets: SetEntry[] = [];
    for (const liftSets of Object.values(sets)) {
      for (const set of liftSets) {
        if (set.weight > 0 || set.reps > 0 || (set.duration || 0) > 0) {
          allSets.push(set);
        }
      }
    }

    try {
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sets: allSets, finish: false }),
      });

      if (res.ok) {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Failed to save changes");
      }
    } catch {
      alert("Network error. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{session.workout.name}</h2>
          <p className="text-sm text-muted">
            {dateStr} &middot; {durationMin} min
          </p>
        </div>
        <button
          onClick={() => router.push("/home")}
          className="px-3 py-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          &larr; Back
        </button>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm text-center">
          Changes saved!
        </div>
      )}

      <div className="space-y-4">
        {session.workout.workoutLifts.map((wl) => {
          const liftSets = sets[wl.liftId] || [];
          const liftType = wl.lift.type || "STRENGTH";

          const gridCols =
            liftType === "STRENGTH"
              ? "grid-cols-[28px_1fr_1fr_36px]"
              : "grid-cols-[28px_1fr_36px]";

          return (
            <div
              key={wl.id}
              className="p-4 bg-card rounded-lg border border-card-border"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold">{wl.lift.name}</h3>
                {liftType !== "STRENGTH" && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    liftType === "BODYWEIGHT" ? "bg-success/15 text-success" : "bg-primary/15 text-primary"
                  }`}>
                    {liftType === "BODYWEIGHT" ? "BW" : "Time"}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className={`grid ${gridCols} gap-1 text-xs text-muted`}>
                  <span>Set</span>
                  {liftType === "STRENGTH" && <span>Weight</span>}
                  <span>{liftType === "ENDURANCE" ? "Seconds" : "Reps"}</span>
                  {editing && <span></span>}
                </div>

                {liftSets.map((set, i) => (
                  <div key={i} className={`grid ${editing ? gridCols : gridCols} gap-1 items-center`}>
                    <span className="text-sm text-muted text-center">
                      {set.setNumber}
                    </span>
                    {liftType === "STRENGTH" && (
                      editing ? (
                        <input
                          type="number"
                          value={set.weight || ""}
                          onChange={(e) => updateSet(wl.liftId, i, "weight", e.target.value)}
                          placeholder="0"
                          min="0"
                          max="2000"
                          step="2.5"
                          className="w-full px-2 py-2 rounded bg-input-bg border border-input-border text-foreground text-center text-lg focus:outline-none focus:border-primary"
                          inputMode="decimal"
                        />
                      ) : (
                        <span className="text-lg text-center">{set.weight || "—"}</span>
                      )
                    )}
                    {liftType === "ENDURANCE" ? (
                      editing ? (
                        <input
                          type="number"
                          value={set.duration || ""}
                          onChange={(e) => updateSet(wl.liftId, i, "duration", e.target.value)}
                          placeholder="sec"
                          min="0"
                          max="86400"
                          className="w-full px-2 py-2 rounded bg-input-bg border border-input-border text-foreground text-center text-lg focus:outline-none focus:border-primary"
                          inputMode="numeric"
                        />
                      ) : (
                        <span className="text-lg text-center">{set.duration || "—"}</span>
                      )
                    ) : (
                      editing ? (
                        <input
                          type="number"
                          value={set.reps || ""}
                          onChange={(e) => updateSet(wl.liftId, i, "reps", e.target.value)}
                          placeholder="0"
                          min="0"
                          max="1000"
                          className="w-full px-2 py-2 rounded bg-input-bg border border-input-border text-foreground text-center text-lg focus:outline-none focus:border-primary"
                          inputMode="numeric"
                        />
                      ) : (
                        <span className="text-lg text-center">{set.reps || "—"}</span>
                      )
                    )}
                    {editing && (
                      <button
                        onClick={() => removeSet(wl.liftId, i)}
                        className="flex items-center justify-center w-9 h-11 text-muted hover:text-danger text-sm rounded transition-colors"
                        title="Remove set"
                      >
                        &#10005;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {editing && (
                <button
                  onClick={() => addSet(wl.liftId)}
                  className="mt-2 w-full py-1.5 text-sm text-primary hover:text-primary-hover border border-dashed border-card-border rounded transition-colors"
                >
                  + Add Set
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 space-y-2 pb-4">
        {editing ? (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                // Reset sets to original
                const initial: Record<string, SetEntry[]> = {};
                for (const wl of session.workout.workoutLifts) {
                  const existing = session.sessionSets.filter(
                    (s) => s.liftId === wl.liftId
                  );
                  initial[wl.liftId] = existing.length > 0
                    ? existing
                    : [{ liftId: wl.liftId, setNumber: 1, weight: 0, reps: 0 }];
                }
                setSets(initial);
              }}
              className="w-full py-3 text-muted hover:text-foreground font-medium transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full py-3 bg-card border border-card-border text-foreground font-semibold rounded-lg hover:border-primary/30 transition-colors"
          >
            Edit Session
          </button>
        )}
      </div>
    </div>
  );
}
