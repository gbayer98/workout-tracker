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

export default function WorkoutsClient({
  initialWorkouts,
  availableLifts,
}: {
  initialWorkouts: Workout[];
  availableLifts: Lift[];
}) {
  const [workouts, setWorkouts] = useState(initialWorkouts);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [selectedLiftIds, setSelectedLiftIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function openCreate() {
    setEditingId(null);
    setFormName("");
    setSelectedLiftIds([]);
    setShowForm(true);
  }

  function openEdit(workout: Workout) {
    setEditingId(workout.id);
    setFormName(workout.name);
    setSelectedLiftIds(workout.workoutLifts.map((wl) => wl.liftId));
    setShowForm(true);
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
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workout and all its session history?")) return;
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

  // Group available lifts by muscle group for the form
  const liftsByGroup = availableLifts.reduce<Record<string, Lift[]>>((acc, lift) => {
    if (!acc[lift.muscleGroup]) acc[lift.muscleGroup] = [];
    acc[lift.muscleGroup].push(lift);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Workouts</h2>
        <button
          onClick={openCreate}
          className="px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-hover transition-colors"
        >
          + New Workout
        </button>
      </div>

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

      {workouts.length === 0 && !showForm && (
        <div className="text-center py-12">
          <p className="text-muted mb-2">No workouts yet</p>
          <p className="text-sm text-muted">
            Create a workout by selecting lifts you want to group together.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {workouts.map((workout) => (
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
              <button
                onClick={() => handleStart(workout.id)}
                className="flex-1 py-2 bg-success text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Workout
              </button>
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
        ))}
      </div>
    </div>
  );
}
