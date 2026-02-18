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
  weekComparison: {
    volumeChange: number | "new" | null;
    setsChange: number | "new" | null;
    workoutsThisWeek: number;
    workoutsLastWeek: number;
  };
  consistencyWeeks: Array<{
    weekLabel: string;
    workouts: number;
  }>;
  bodyWeight: {
    current: number;
    change: number | null;
  } | null;
  activeSession: {
    id: string;
    workoutName: string;
  } | null;
  distanceThisWeek: number;
  quickRepeat: {
    workoutId: string;
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
  const [startingWorkout, setStartingWorkout] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
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

  async function handleQuickRepeat() {
    if (!data?.quickRepeat || startingWorkout) return;
    setStartingWorkout(true);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workoutId: data.quickRepeat.workoutId }),
      });

      if (res.ok) {
        const session = await res.json();
        router.push(`/session/${session.id}`);
      } else if (res.status === 409) {
        const d = await res.json();
        if (d.sessionId) router.push(`/session/${d.sessionId}`);
      } else if (res.status === 404) {
        setData((prev) => prev ? { ...prev, quickRepeat: null } : prev);
        setStartingWorkout(false);
      } else {
        setStartingWorkout(false);
      }
    } catch {
      alert("Network error. Please check your connection.");
      setStartingWorkout(false);
    }
  }

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

  const formatChange = (change: number | "new" | null) => {
    if (change === null) return null;
    if (change === "new") return "+new";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change}%`;
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
          onClick={() => router.push(`/session/${data.activeSession!.id}`)}
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

      {/* Quick Repeat Last Workout */}
      {data.quickRepeat && !data.activeSession && (
        <button
          onClick={handleQuickRepeat}
          disabled={startingWorkout}
          className="w-full p-4 bg-primary/10 border border-primary/30 rounded-xl text-left transition-colors hover:bg-primary/15 disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary font-semibold text-sm">
                Repeat Last Workout
              </p>
              <p className="text-lg font-bold mt-0.5">
                {data.quickRepeat.workoutName}
              </p>
            </div>
            <div className="text-primary text-2xl">&#8250;</div>
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
          change={formatChange(data.weekComparison.setsChange)}
        />
        <StatCard
          label="Mass Moved (7d)"
          value={formatVolume(data.stats.totalVolume)}
          unit="lbs"
          change={formatChange(data.weekComparison.volumeChange)}
        />
        {data.distanceThisWeek > 0 && (
          <StatCard
            label="Distance (7d)"
            value={data.distanceThisWeek.toString()}
            unit="mi"
          />
        )}
      </div>

      {/* Consistency Graph */}
      {data.consistencyWeeks.length > 0 && (
        <div className="p-4 bg-card rounded-xl border border-card-border">
          <p className="text-sm font-medium mb-3">8-Week Consistency</p>
          <div className="flex items-end justify-between gap-1">
            {data.consistencyWeeks.map((week, i) => {
              const maxWorkouts = Math.max(
                ...data.consistencyWeeks.map((w) => w.workouts),
                1
              );
              const heightPercent = (week.workouts / maxWorkouts) * 100;
              const isCurrentWeek = i === data.consistencyWeeks.length - 1;

              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div className="w-full flex flex-col items-center" style={{ height: 48 }}>
                    <div className="flex-1" />
                    {week.workouts > 0 ? (
                      <div
                        className={`w-full rounded-sm ${
                          isCurrentWeek ? "bg-primary" : "bg-primary/40"
                        }`}
                        style={{
                          height: `${Math.max(heightPercent, 15)}%`,
                          minHeight: 4,
                        }}
                      />
                    ) : (
                      <div className="w-full h-1 rounded-sm bg-card-border" />
                    )}
                  </div>
                  <span className="text-[9px] text-muted mt-1">{week.weekLabel}</span>
                  <span className="text-[10px] font-medium">
                    {week.workouts > 0 ? week.workouts : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Feedback */}
      {!feedbackOpen ? (
        <button
          onClick={() => {
            setFeedbackOpen(true);
            setFeedbackSent(false);
            setFeedbackText("");
          }}
          className="w-full p-3 bg-card rounded-xl border border-dashed border-card-border text-center hover:border-primary/30 transition-colors"
        >
          <p className="text-sm text-muted">
            &#128172; Have a suggestion or feedback?
          </p>
        </button>
      ) : (
        <div className="p-4 bg-card rounded-xl border border-card-border">
          {feedbackSent ? (
            <div className="text-center py-2">
              <p className="text-success font-medium">Thanks for your feedback!</p>
              <p className="text-xs text-muted mt-1">We&apos;ll review it soon.</p>
              <button
                onClick={() => setFeedbackOpen(false)}
                className="mt-3 text-sm text-muted hover:text-foreground"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium mb-2">
                Suggest a feature or share feedback
              </p>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What would make this app better for you?"
                maxLength={1000}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-input-bg border border-input-border text-foreground text-sm resize-none focus:outline-none focus:border-primary"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted">
                  {feedbackText.length}/1000
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFeedbackOpen(false)}
                    className="px-3 py-1.5 text-sm text-muted hover:text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!feedbackText.trim()) return;
                      setFeedbackSending(true);
                      try {
                        const res = await fetch("/api/feedback", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ message: feedbackText }),
                        });
                        if (res.ok) {
                          setFeedbackSent(true);
                        }
                      } catch {
                        // silently fail
                      }
                      setFeedbackSending(false);
                    }}
                    disabled={!feedbackText.trim() || feedbackSending}
                    className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {feedbackSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  change,
}: {
  label: string;
  value: string;
  unit: string;
  change?: string | null;
}) {
  return (
    <div className="p-3 bg-card rounded-xl border border-card-border">
      <p className="text-xs text-muted">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted">{unit}</span>
      </div>
      {change && (
        <p
          className={`text-xs mt-0.5 ${
            change.startsWith("+")
              ? "text-success"
              : change.startsWith("-")
              ? "text-danger"
              : "text-muted"
          }`}
        >
          {change} vs last week
        </p>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}
