"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RecentSession {
  id: string;
  workoutName: string;
  startedAt: string;
  finishedAt: string;
  setCount: number;
  duration: number;
}

interface DashboardData {
  recentSessions: RecentSession[];
  stats: {
    workoutsThisWeek: number;
    weekStreak: number;
    totalSets: number;
    totalVolume: number;
  };
  bodyWeight: {
    current: number;
    change: number | null;
  } | null;
  personalRecords: Array<{
    liftName: string;
    weight: number;
    reps: number;
    date: string;
  }>;
  activeSession: {
    id: string;
    workoutName: string;
  } | null;
}

export default function HomeClient({
  userName,
}: {
  userName: string;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const greeting = getGreeting();

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-muted text-sm">{greeting}</p>
          <h2 className="text-2xl font-bold">{userName}</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted">Could not load dashboard</p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toString();
  };

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <p className="text-muted text-sm">{greeting}</p>
        <h2 className="text-2xl font-bold">{userName}</h2>
      </div>

      {/* Active Session Banner */}
      {data.activeSession && (
        <button
          onClick={() =>
            router.push(`/session/${data.activeSession!.id}`)
          }
          className="w-full p-4 bg-success/15 border border-success/30 rounded-xl text-left transition-colors hover:bg-success/20"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-success font-semibold text-sm">
                Active Session
              </p>
              <p className="text-lg font-bold mt-0.5">
                {data.activeSession.workoutName}
              </p>
            </div>
            <div className="text-success text-2xl">&#8250;</div>
          </div>
        </button>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="This Week"
          value={data.stats.workoutsThisWeek.toString()}
          unit="workouts"
        />
        <StatCard
          label="Streak"
          value={data.stats.weekStreak.toString()}
          unit={data.stats.weekStreak === 1 ? "week" : "weeks"}
        />
        <StatCard
          label="Sets (7d)"
          value={data.stats.totalSets.toString()}
          unit="total"
        />
        <StatCard
          label="Volume (7d)"
          value={formatVolume(data.stats.totalVolume)}
          unit="lbs"
        />
      </div>

      {/* Body Weight Card */}
      {data.bodyWeight && (
        <Link href="/weight" className="block">
          <div className="p-4 bg-card rounded-xl border border-card-border hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">Body Weight</p>
                <p className="text-2xl font-bold mt-0.5">
                  {data.bodyWeight.current} lbs
                </p>
              </div>
              {data.bodyWeight.change !== null && (
                <div className="text-right text-foreground">
                  <p className="text-sm text-muted">7-day change</p>
                  <p className="text-lg font-semibold">
                    {data.bodyWeight.change > 0 ? "+" : ""}
                    {data.bodyWeight.change.toFixed(1)} lbs
                  </p>
                </div>
              )}
            </div>
          </div>
        </Link>
      )}

      {/* Personal Records */}
      {data.personalRecords.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Personal Records</h3>
            <Link href="/lifts" className="text-sm text-primary">
              All lifts
            </Link>
          </div>
          <div className="space-y-2">
            {data.personalRecords.map((pr, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-card rounded-lg border border-card-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : "\u{1F949}"}
                  </span>
                  <span className="font-medium">{pr.liftName}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{pr.weight} lbs</p>
                  <p className="text-xs text-muted">{pr.reps} reps</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Last 7 Days</h3>
          <Link href="/workouts" className="text-sm text-primary">
            Workouts
          </Link>
        </div>

        {data.recentSessions.length === 0 ? (
          <div className="p-6 bg-card rounded-xl border border-card-border text-center">
            <p className="text-muted mb-2">No workouts in the last 7 days</p>
            <Link
              href="/workouts"
              className="text-primary text-sm font-medium hover:text-primary-hover"
            >
              Start a workout
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentSessions.map((s) => (
              <div
                key={s.id}
                className="p-3 bg-card rounded-lg border border-card-border"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.workoutName}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatDate(s.startedAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{s.duration} min</p>
                    <p className="text-xs text-muted">{s.setCount} sets</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 pb-2">
        <Link
          href="/workouts"
          className="p-3 bg-card rounded-xl border border-card-border text-center hover:border-primary/30 transition-colors"
        >
          <p className="text-2xl mb-1">&#128170;</p>
          <p className="text-xs font-medium">Start Workout</p>
        </Link>
        <Link
          href="/weight"
          className="p-3 bg-card rounded-xl border border-card-border text-center hover:border-primary/30 transition-colors"
        >
          <p className="text-2xl mb-1">&#9878;&#65039;</p>
          <p className="text-xs font-medium">Log Weight</p>
        </Link>
        <Link
          href="/lifts"
          className="p-3 bg-card rounded-xl border border-card-border text-center hover:border-primary/30 transition-colors"
        >
          <p className="text-2xl mb-1">&#128200;</p>
          <p className="text-xs font-medium">View Lifts</p>
        </Link>
      </div>
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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}
