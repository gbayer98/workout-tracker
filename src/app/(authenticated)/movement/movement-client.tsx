"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface MovementEntry {
  id: string;
  type: "RUN" | "WALK";
  distance: number;
  duration: number | null;
  date: string;
}

interface MovementData {
  movements: MovementEntry[];
  stats: {
    distanceThisWeek: number;
    totalDistance: number;
    longestRun: number;
    avgDistance: number;
    totalRuns: number;
    totalWalks: number;
    count: number;
  };
  weeklyTrend: Array<{ weekLabel: string; distance: number }>;
}

export default function MovementClient() {
  const [data, setData] = useState<MovementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<"RUN" | "WALK">("RUN");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/movement")
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!distance || parseFloat(distance) <= 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/movement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          distance,
          duration: duration || null,
          date,
        }),
      });

      if (res.ok) {
        setDistance("");
        setDuration("");
        const refreshRes = await fetch("/api/movement");
        if (refreshRes.ok) {
          setData(await refreshRes.json());
        }
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to save movement");
      }
    } catch {
      setError("Network error — check your connection");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted">Loading movement data...</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      <h2 className="text-xl font-bold mb-4">Movement</h2>

      {/* Input form */}
      <form
        onSubmit={handleSave}
        className="mb-6 p-4 bg-card rounded-lg border border-card-border space-y-3"
      >
        {/* Type toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("RUN")}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
              type === "RUN"
                ? "bg-primary/20 border border-primary/40 text-primary"
                : "bg-input-bg border border-input-border text-muted"
            }`}
          >
            Run
          </button>
          <button
            type="button"
            onClick={() => setType("WALK")}
            className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
              type === "WALK"
                ? "bg-success/20 border border-success/40 text-success"
                : "bg-input-bg border border-input-border text-muted"
            }`}
          >
            Walk
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-muted mb-1">
              Distance (mi)
            </label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="0.0"
              step="0.1"
              className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground text-lg text-center focus:outline-none focus:border-primary"
              inputMode="decimal"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              Duration (min)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="--"
              className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground text-lg text-center focus:outline-none focus:border-primary"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground focus:outline-none focus:border-primary"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : `Log ${type === "RUN" ? "Run" : "Walk"}`}
        </button>
      </form>

      {/* Stats */}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <StatCard
              label="This Week"
              value={data.stats.distanceThisWeek.toString()}
              unit="miles"
            />
            <StatCard
              label="All Time"
              value={data.stats.totalDistance.toString()}
              unit="miles"
            />
            <StatCard
              label="Longest Run"
              value={data.stats.longestRun.toString()}
              unit="miles"
            />
            <StatCard
              label="Avg Distance"
              value={data.stats.avgDistance.toString()}
              unit="miles"
            />
          </div>

          {/* Run / Walk split */}
          {data.stats.count > 0 && (
            <div className="mb-4 p-4 bg-card rounded-lg border border-card-border">
              <p className="text-sm font-medium mb-2">Distance Split</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">
                    Running: {data.stats.totalRuns} mi
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm">
                    Walking: {data.stats.totalWalks} mi
                  </span>
                </div>
              </div>
              <div className="mt-2 flex h-3 rounded-full overflow-hidden bg-card-border">
                {data.stats.totalDistance > 0 && (
                  <>
                    <div
                      className="bg-primary"
                      style={{
                        width: `${(data.stats.totalRuns / data.stats.totalDistance) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-success"
                      style={{
                        width: `${(data.stats.totalWalks / data.stats.totalDistance) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Weekly Trend Chart */}
          {data.weeklyTrend.some((w) => w.distance > 0) && (
            <div className="mb-4 p-4 bg-card rounded-lg border border-card-border">
              <p className="text-sm font-medium mb-3">Weekly Distance</p>
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.weeklyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis
                      dataKey="weekLabel"
                      stroke="#737373"
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      stroke="#737373"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: "miles",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#737373", fontSize: 11 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${value} mi`, "Distance"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="distance"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {data.movements.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {[...data.movements]
                  .reverse()
                  .slice(0, 10)
                  .map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border border-card-border"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            m.type === "RUN"
                              ? "bg-primary/15 text-primary"
                              : "bg-success/15 text-success"
                          }`}
                        >
                          {m.type}
                        </span>
                        <span className="font-medium">
                          {m.distance} mi
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted">
                          {formatDate(m.date)}
                        </p>
                        {m.duration && (
                          <p className="text-xs text-muted">
                            {m.duration} min
                            {m.distance > 0 &&
                              ` \u2022 ${(m.duration / m.distance).toFixed(1)} min/mi`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="p-3 bg-card rounded-xl border border-card-border">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
}
