"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

// Compound lifts get longer rest (90s), isolation gets 60s
const COMPOUND_LIFTS = [
  "Bench Press", "Incline Bench Press", "Overhead Press", "Squat",
  "Deadlift", "Romanian Deadlift", "Barbell Row", "Leg Press", "Pull-Up",
];

function getRestSeconds(liftName: string): number {
  return COMPOUND_LIFTS.some((c) => liftName.includes(c)) ? 90 : 60;
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
    const initial: Record<string, SetEntry[]> = {};
    for (const wl of session.workout.workoutLifts) {
      const existing = session.sessionSets.filter(
        (s) => s.liftId === wl.liftId
      );
      if (existing.length > 0) {
        initial[wl.liftId] = existing;
      } else {
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

  // Rest timer state
  const [restTimer, setRestTimer] = useState<{
    active: boolean;
    totalSeconds: number;
    remainingSeconds: number;
    liftName: string;
  }>({ active: false, totalSeconds: 0, remainingSeconds: 0, liftName: "" });
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track completed sets to detect new set completions
  const completedSetsRef = useRef<Set<string>>(new Set());

  // Session timer
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

  // Rest timer countdown
  useEffect(() => {
    if (restTimer.active && restTimer.remainingSeconds > 0) {
      restIntervalRef.current = setInterval(() => {
        setRestTimer((prev) => {
          if (prev.remainingSeconds <= 1) {
            // Timer done - try to vibrate
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
            return { ...prev, active: false, remainingSeconds: 0 };
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
      return () => {
        if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      };
    }
  }, [restTimer.active, restTimer.remainingSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRestTimer = useCallback((liftName: string) => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    const seconds = getRestSeconds(liftName);
    setRestTimer({
      active: true,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      liftName,
    });
  }, []);

  const dismissRestTimer = useCallback(() => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestTimer((prev) => ({ ...prev, active: false, remainingSeconds: 0 }));
  }, []);

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

  // Called on blur — only triggers on first completion to avoid phantom timers
  function handleSetBlur(liftId: string, setIndex: number) {
    const liftSets = sets[liftId] || [];
    const set = liftSets[setIndex];
    if (!set || set.weight <= 0 || set.reps <= 0) return;

    const setKey = `${liftId}-${setIndex}-${set.weight}-${set.reps}`;
    if (completedSetsRef.current.has(setKey)) return;
    completedSetsRef.current.add(setKey);

    const wl = session.workout.workoutLifts.find((w) => w.liftId === liftId);
    if (wl) startRestTimer(wl.lift.name);
  }

  // Called on checkmark tap — always starts/restarts the rest timer
  function handleSetCheck(liftId: string, setIndex: number) {
    const liftSets = sets[liftId] || [];
    const set = liftSets[setIndex];
    if (!set || set.weight <= 0 || set.reps <= 0) return;

    const wl = session.workout.workoutLifts.find((w) => w.liftId === liftId);
    if (wl) startRestTimer(wl.lift.name);
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

  const restMinutes = Math.floor(restTimer.remainingSeconds / 60);
  const restSeconds = restTimer.remainingSeconds % 60;
  const restProgress = restTimer.totalSeconds > 0
    ? ((restTimer.totalSeconds - restTimer.remainingSeconds) / restTimer.totalSeconds) * 100
    : 0;

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

      {/* Rest Timer */}
      {restTimer.active && restTimer.remainingSeconds > 0 && (
        <button
          onClick={dismissRestTimer}
          className="w-full mb-4 p-3 bg-primary/10 border border-primary/30 rounded-xl text-left transition-colors hover:bg-primary/15"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-primary">
              Rest — {restTimer.liftName}
            </p>
            <p className="text-lg font-mono font-bold text-primary">
              {restMinutes}:{restSeconds.toString().padStart(2, "0")}
            </p>
          </div>
          <div className="w-full h-1.5 bg-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${restProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted mt-1.5 text-center">Tap to dismiss</p>
        </button>
      )}

      {/* Timer done notification */}
      {!restTimer.active && restTimer.totalSeconds > 0 && restTimer.remainingSeconds === 0 && (
        <button
          onClick={() => setRestTimer({ active: false, totalSeconds: 0, remainingSeconds: 0, liftName: "" })}
          className="w-full mb-4 p-3 bg-success/15 border border-success/30 rounded-xl text-center transition-colors hover:bg-success/20"
        >
          <p className="text-success font-semibold">Rest complete! Time to lift.</p>
          <p className="text-xs text-muted mt-1">Tap to dismiss</p>
        </button>
      )}

      <div className="space-y-6">
        {session.workout.workoutLifts.map((wl) => {
          const liftSets = sets[wl.liftId] || [];
          const last = lastByLift[wl.liftId];
          const restDuration = getRestSeconds(wl.lift.name);

          return (
            <div
              key={wl.id}
              className="p-4 bg-card rounded-lg border border-card-border"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{wl.lift.name}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{restDuration}s rest</span>
                  {last && (
                    <span className="text-xs text-muted">
                      Last: {last.weight}x{last.reps}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-[28px_1fr_1fr_36px_36px] gap-1 text-xs text-muted">
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span></span>
                  <span></span>
                </div>

                {liftSets.map((set, i) => {
                  const isComplete = set.weight > 0 && set.reps > 0;
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[28px_1fr_1fr_36px_36px] gap-1 items-center"
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
                        onBlur={() => handleSetBlur(wl.liftId, i)}
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
                        onBlur={() => handleSetBlur(wl.liftId, i)}
                        placeholder="0"
                        className="w-full px-2 py-2 rounded bg-input-bg border border-input-border text-foreground text-center text-lg focus:outline-none focus:border-primary"
                        inputMode="numeric"
                      />
                      <button
                        onClick={() => {
                          handleSetCheck(wl.liftId, i);
                        }}
                        className={`flex items-center justify-center w-9 h-11 rounded transition-colors ${
                          isComplete
                            ? "text-success"
                            : "text-muted hover:text-foreground"
                        }`}
                        title="Log set & start rest timer"
                      >
                        &#10003;
                      </button>
                      <button
                        onClick={() => removeSet(wl.liftId, i)}
                        className="flex items-center justify-center w-9 h-11 text-muted hover:text-danger text-sm rounded transition-colors"
                        title="Remove set"
                      >
                        &#10005;
                      </button>
                    </div>
                  );
                })}
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
