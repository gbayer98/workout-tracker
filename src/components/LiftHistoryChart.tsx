"use client";

import { useEffect, useState } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ChartData {
  date: string;
  weight?: number;
  reps?: number;
  duration?: number;
}

export default function LiftHistoryChart({
  liftId,
  liftName,
  liftType = "STRENGTH",
}: {
  liftId: string;
  liftName: string;
  liftType?: "STRENGTH" | "BODYWEIGHT" | "ENDURANCE";
}) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/lifts/${liftId}/history`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [liftId]);

  if (loading) {
    return (
      <div className="p-4 bg-card rounded-lg border border-card-border">
        <p className="text-muted text-sm">Loading history...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-4 bg-card rounded-lg border border-card-border">
        <p className="text-sm font-medium mb-1">{liftName} History</p>
        <p className="text-muted text-sm">
          No history yet. Start a workout to track this lift!
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${seconds}s`;
  };

  if (liftType === "ENDURANCE") {
    return (
      <div className="p-4 bg-card rounded-lg border border-card-border">
        <p className="text-sm font-medium mb-3">{liftName} History</p>
        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#737373"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#10b981"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatDuration(v)}
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin * 0.8)),
                  (dataMax: number) => Math.ceil(dataMax * 1.2),
                ]}
                label={{
                  value: "Duration",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#10b981", fontSize: 11 },
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
                formatter={(value) => [formatDuration(Number(value)), "Duration"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
                name="Duration"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  if (liftType === "BODYWEIGHT") {
    return (
      <div className="p-4 bg-card rounded-lg border border-card-border">
        <p className="text-sm font-medium mb-3">{liftName} History</p>
        <div style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="#737373"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#ef4444"
                tick={{ fontSize: 11 }}
                domain={[
                  (dataMin: number) => Math.max(0, dataMin - 2),
                  (dataMax: number) => dataMax + 2,
                ]}
                label={{
                  value: "Reps",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#ef4444", fontSize: 11 },
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
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="reps"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 3 }}
                name="Reps"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // STRENGTH: dual-axis weight + reps (default)
  return (
    <div className="p-4 bg-card rounded-lg border border-card-border">
      <p className="text-sm font-medium mb-3">{liftName} History</p>
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#737373"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="weight"
              orientation="left"
              stroke="#3b82f6"
              tick={{ fontSize: 11 }}
              domain={[
                (dataMin: number) => Math.max(0, Math.floor(dataMin - 5)),
                (dataMax: number) => Math.ceil(dataMax + 5),
              ]}
              label={{
                value: "Weight (lbs)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#3b82f6", fontSize: 11 },
              }}
            />
            <YAxis
              yAxisId="reps"
              orientation="right"
              stroke="#ef4444"
              tick={{ fontSize: 11 }}
              domain={[
                (dataMin: number) => Math.max(0, dataMin - 2),
                (dataMax: number) => dataMax + 2,
              ]}
              label={{
                value: "Reps",
                angle: 90,
                position: "insideRight",
                style: { fill: "#ef4444", fontSize: 11 },
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
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
            />
            <Line
              yAxisId="weight"
              type="stepAfter"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 3 }}
              name="Weight (lbs)"
            />
            <Line
              yAxisId="reps"
              type="monotone"
              dataKey="reps"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", r: 3 }}
              name="Reps"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
