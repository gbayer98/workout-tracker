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

  // Recent sessions (last 7 days) with workout name and set count
  const recentSessions = await prisma.session.findMany({
    where: {
      userId,
      finishedAt: { not: null },
      startedAt: { gte: sevenDaysAgo },
    },
    include: {
      workout: true,
      sessionSets: true,
    },
    orderBy: { startedAt: "desc" },
  });

  // All finished sessions for streak calculation
  const allSessions = await prisma.session.findMany({
    where: {
      userId,
      finishedAt: { not: null },
    },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });

  // Calculate current workout streak (consecutive weeks with at least one workout)
  const weekStreak = calculateWeekStreak(allSessions.map((s) => s.startedAt));

  // Total workouts this week (Mon-Sun of current week)
  const thisWeekStart = getWeekStart(now);
  const workoutsThisWeek = allSessions.filter(
    (s) => s.startedAt >= thisWeekStart
  ).length;

  // Latest body weight entry
  const latestWeight = await prisma.bodyWeight.findFirst({
    where: { userId },
    orderBy: { recordedAt: "desc" },
  });

  // Body weight change (latest vs 7 days ago)
  const prevWeight = await prisma.bodyWeight.findFirst({
    where: { userId, recordedAt: { lt: sevenDaysAgo } },
    orderBy: { recordedAt: "desc" },
  });

  // Personal records (heaviest single set for each lift the user has done)
  const personalRecords = await prisma.sessionSet.findMany({
    where: {
      session: { userId, finishedAt: { not: null } },
    },
    include: { lift: true, session: true },
    orderBy: { weight: "desc" },
  });

  // Get top 3 personal records (heaviest unique lifts)
  const prMap = new Map<string, { liftName: string; weight: number; reps: number; date: string }>();
  for (const set of personalRecords) {
    if (!prMap.has(set.liftId)) {
      prMap.set(set.liftId, {
        liftName: set.lift.name,
        weight: Number(set.weight),
        reps: set.reps,
        date: set.session.startedAt.toISOString().split("T")[0],
      });
    }
  }
  const topPRs = Array.from(prMap.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  // Check for active session
  const activeSession = await prisma.session.findFirst({
    where: { userId, finishedAt: null },
    include: { workout: true },
  });

  // Total sets and total volume (weight * reps) in last 7 days
  let totalSets = 0;
  let totalVolume = 0;
  for (const s of recentSessions) {
    totalSets += s.sessionSets.length;
    for (const set of s.sessionSets) {
      totalVolume += Number(set.weight) * set.reps;
    }
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
    bodyWeight: latestWeight
      ? {
          current: Number(latestWeight.weight),
          change: prevWeight
            ? Number(latestWeight.weight) - Number(prevWeight.weight)
            : null,
        }
      : null,
    personalRecords: topPRs,
    activeSession: activeSession
      ? { id: activeSession.id, workoutName: activeSession.workout.name }
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

  // Get unique week start dates
  const weekStarts = new Set<string>();
  for (const date of dates) {
    const ws = getWeekStart(date);
    weekStarts.add(ws.toISOString().split("T")[0]);
  }

  // Check if current week has workouts - if not, start from last week
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
