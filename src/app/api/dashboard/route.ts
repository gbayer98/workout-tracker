import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  // Last 7 days range
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Last 14 days range (for week-over-week comparison)
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  // Recent sessions (last 14 days) for both current and previous week stats
  const twoWeekSessions = await prisma.session.findMany({
    where: {
      userId,
      finishedAt: { not: null },
      startedAt: { gte: fourteenDaysAgo },
    },
    include: {
      workout: true,
      sessionSets: true,
    },
    orderBy: { startedAt: "desc" },
  });

  const recentSessions = twoWeekSessions.filter(
    (s) => s.startedAt >= sevenDaysAgo
  );
  const prevWeekSessions = twoWeekSessions.filter(
    (s) => s.startedAt < sevenDaysAgo
  );

  // All finished sessions for streak + consistency
  const allSessions = await prisma.session.findMany({
    where: {
      userId,
      finishedAt: { not: null },
    },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });

  // Streak
  const weekStreak = calculateWeekStreak(allSessions.map((s) => s.startedAt));

  // Total workouts this week
  const thisWeekStart = getWeekStart(now);
  const workoutsThisWeek = allSessions.filter(
    (s) => s.startedAt >= thisWeekStart
  ).length;

  // Body weight
  const latestWeight = await prisma.bodyWeight.findFirst({
    where: { userId },
    orderBy: { recordedAt: "desc" },
  });

  const prevWeight = await prisma.bodyWeight.findFirst({
    where: { userId, recordedAt: { lt: sevenDaysAgo } },
    orderBy: { recordedAt: "desc" },
  });

  // Movement distance this week
  const movements = await prisma.movement.findMany({
    where: { userId, date: { gte: sevenDaysAgo } },
  });
  const distanceThisWeek = movements.reduce(
    (sum, m) => sum + Number(m.distance),
    0
  );

  // Active session
  const activeSession = await prisma.session.findFirst({
    where: { userId, finishedAt: null },
    include: { workout: true },
  });

  // This week stats
  let totalSets = 0;
  let totalVolume = 0;
  for (const s of recentSessions) {
    totalSets += s.sessionSets.length;
    for (const set of s.sessionSets) {
      totalVolume += Number(set.weight) * set.reps;
    }
  }

  // Last week stats (for comparison)
  let prevSets = 0;
  let prevVolume = 0;
  for (const s of prevWeekSessions) {
    prevSets += s.sessionSets.length;
    for (const set of s.sessionSets) {
      prevVolume += Number(set.weight) * set.reps;
    }
  }

  // --- Feature 2: Quick Repeat Last Workout ---
  const lastFinishedSession = await prisma.session.findFirst({
    where: { userId, finishedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    include: { workout: true },
  });

  // --- Feature 3: Consistency graph (last 8 weeks) ---
  const consistencyWeeks: Array<{ weekLabel: string; workouts: number }> = [];

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(thisWeekStart);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const count = allSessions.filter(
      (s) => s.startedAt >= weekStart && s.startedAt < weekEnd
    ).length;

    const monthDay = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
    consistencyWeeks.push({ weekLabel: monthDay, workouts: count });
  }

  return NextResponse.json({
    recentSessions: recentSessions.map((s) => ({
      id: s.id,
      workoutName: s.workout.name,
      startedAt: s.startedAt.toISOString(),
      finishedAt: s.finishedAt!.toISOString(),
      setCount: s.sessionSets.length,
      duration: Math.round(
        (s.finishedAt!.getTime() - s.startedAt.getTime()) / 60000
      ),
    })),
    stats: {
      workoutsThisWeek,
      weekStreak,
      totalSets,
      totalVolume: Math.round(totalVolume),
    },
    weekComparison: {
      volumeChange: prevVolume > 0
        ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100)
        : totalVolume > 0 ? "new" : null,
      setsChange: prevSets > 0
        ? Math.round(((totalSets - prevSets) / prevSets) * 100)
        : totalSets > 0 ? "new" : null,
      workoutsThisWeek: recentSessions.length,
      workoutsLastWeek: prevWeekSessions.length,
    },
    consistencyWeeks,
    bodyWeight: latestWeight
      ? {
          current: Number(latestWeight.weight),
          change: prevWeight
            ? Number(latestWeight.weight) - Number(prevWeight.weight)
            : null,
        }
      : null,
    distanceThisWeek: Math.round(distanceThisWeek * 10) / 10,
    activeSession: activeSession
      ? { id: activeSession.id, workoutName: activeSession.workout.name }
      : null,
    quickRepeat: lastFinishedSession
      ? {
          workoutId: lastFinishedSession.workoutId,
          workoutName: lastFinishedSession.workout.name,
        }
      : null,
  });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateWeekStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;

  const now = new Date();
  const currentWeekStart = getWeekStart(now);

  const weekStarts = new Set<string>();
  for (const date of dates) {
    const ws = getWeekStart(date);
    weekStarts.add(ws.toISOString().split("T")[0]);
  }

  const currentWeekKey = currentWeekStart.toISOString().split("T")[0];
  let checkDate = weekStarts.has(currentWeekKey)
    ? new Date(currentWeekStart)
    : new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  let streak = 0;
  while (true) {
    const key = checkDate.toISOString().split("T")[0];
    if (weekStarts.has(key)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return streak;
}
