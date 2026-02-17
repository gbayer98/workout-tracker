"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeightEntry {
  id: string;
  weight: number;
  date: string;
}

export default function WeightClient({
  initialEntries,
}: {
  initialEntries: WeightEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const numWeight = parseFloat(weight);
    if (!numWeight || numWeight <= 0) return;
    setSaving(true);

    const res = await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: numWeight, date }),
    });

    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => {
        const filtered = prev.filter((e) => e.date !== entry.date);
        return [...filtered, entry].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      });
      setWeight("");
    }
    setSaving(false);
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const minWeight = entries.length > 0
    ? Math.floor(Math.min(...entries.map((e) => e.weight)) - 2)
    : 0;
  const maxWeight = entries.length > 0
    ? Math.ceil(Math.max(...entries.map((e) => e.weight)) + 2)
    : 200;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Body Weight</h2>

      <form
        onSubmit={handleSave}
        className="mb-6 p-4 bg-card rounded-lg border border-card-border space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-muted mb-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="180.0"
              step="0.1"
              className="w-full px-3 py-3 rounded-lg bg-input-bg border border-input-border text-foreground text-lg text-center focus:outline-none focus:border-primary"
              inputMode="decimal"
              required
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
          {saving ? "Saving..." : "Save Weight"}
        </button>
      </form>

      {entries.length > 0 ? (
        <div className="p-4 bg-card rounded-lg border border-card-border">
          <p className="text-sm font-medium mb-3">Weight Trend</p>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={entries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#737373"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[minWeight, maxWeight]}
                  stroke="#737373"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "lbs",
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
                  labelFormatter={(label) => formatDate(String(label))}
                  formatter={(value) => [`${value} lbs`, "Weight"]}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted">No weight entries yet</p>
          <p className="text-sm text-muted mt-1">
            Enter your weight above to start tracking!
          </p>
        </div>
      )}
    </div>
  );
}
