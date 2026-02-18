import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.id;

  const categories = await prisma.leaderboardCategory.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const now = new Date();
  const weekStart = getWeekStart(now);

  const results: Array<{
    id: string;
    name: string;
    metric: string;
    rule: string;
    entries: Array<{
      username: string;
      value: number;
      unit: string;
      date?: string;
      isCurrentUser: boolean;
    }>;
  }> = [];

  for (const category of categories) {
    if (category.liftName === "Bench Press" || category.liftName === "Squat") {
      // Max weight with at least 3 reps
      const lift = await prisma.lift.findFirst({
        where: { name: category.liftName, isGlobal: true },
      });

      if (!lift) {
        results.push({
          id: category.id,
          name: category.name,
          metric: category.metric,
          rule: category.rule,
          entries: [],
        });
        continue;
      }

      const qualifyingSets = await prisma.sessionSet.findMany({
        where: {
          liftId: lift.id,
          reps: { gte: 3 },
          session: { finishedAt: { not: null } },
        },
        include: {
          session: { include: { user: true } },
        },
        orderBy: { weight: "desc" },
      });

      const userBest: Record<
        string,
        { username: string; weight: number; date: string }
      > = {};
      for (const s of qualifyingSets) {
        const userId = s.session.userId;
        const weight = Number(s.weight);
        if (!userBest[userId] || weight > userBest[userId].weight) {
          userBest[userId] = {
            username: s.session.user.displayName || s.session.user.username,
            weight,
            date: s.session.startedAt.toISOString().split("T")[0],
          };
        }
      }

      const sorted = Object.entries(userBest)
        .sort((a, b) => b[1].weight - a[1].weight);

      results.push({
        id: category.id,
        name: category.name,
        metric: category.metric,
        rule: category.rule,
        entries: sorted.map(([userId, data]) => ({
          username: data.username,
          value: data.weight,
          unit: "lbs",
          date: data.date,
          isCurrentUser: userId === currentUserId,
        })),
      });
    } else if (category.liftName === "Push-Up") {
      // Max reps in single set
      const lift = await prisma.lift.findFirst({
        where: { name: "Push-Up", isGlobal: true },
      });

      if (!lift) {
        results.push({
          id: category.id,
          name: category.name,
          metric: category.metric,
          rule: category.rule,
          entries: [],
        });
        continue;
      }

      const sets = await prisma.sessionSet.findMany({
        where: {
          liftId: lift.id,
          session: { finishedAt: { not: null } },
        },
        include: {
          session: { include: { user: true } },
        },
        orderBy: { reps: "desc" },
      });

      const userBest: Record<
        string,
        { username: string; reps: number; date: string }
      > = {};
      for (const s of sets) {
        const userId = s.session.userId;
        if (!userBest[userId] || s.reps > userBest[userId].reps) {
          userBest[userId] = {
            username: s.session.user.displayName || s.session.user.username,
            reps: s.reps,
            date: s.session.startedAt.toISOString().split("T")[0],
          };
        }
      }

      const sorted = Object.entries(userBest)
        .sort((a, b) => b[1].reps - a[1].reps);

      results.push({
        id: category.id,
        name: category.name,
        metric: category.metric,
        rule: category.rule,
        entries: sorted.map(([userId, data]) => ({
          username: data.username,
          value: data.reps,
          unit: "reps",
          date: data.date,
          isCurrentUser: userId === currentUserId,
        })),
      });
    } else if (category.name === "Workouts This Week") {
      // Finished sessions this week
      const sessions = await prisma.session.findMany({
        where: {
          finishedAt: { not: null },
          startedAt: { gte: weekStart },
        },
        include: { user: true },
      });

      const userCounts: Record<string, { username: string; count: number }> = {};
      for (const s of sessions) {
        if (!userCounts[s.userId]) {
          userCounts[s.userId] = { username: s.user.displayName || s.user.username, count: 0 };
        }
        userCounts[s.userId].count++;
      }

      const sorted = Object.entries(userCounts)
        .sort((a, b) => b[1].count - a[1].count);

      results.push({
        id: category.id,
        name: category.name,
        metric: category.metric,
        rule: category.rule,
        entries: sorted.map(([userId, data]) => ({
          username: data.username,
          value: data.count,
          unit: "workouts",
          isCurrentUser: userId === currentUserId,
        })),
      });
    } else if (category.name === "Total Miles Moved") {
      // All-time total distance from movement entries
      const movements = await prisma.movement.findMany({
        include: { user: true },
      });

      const userTotals: Record<string, { username: string; total: number }> = {};
      for (const m of movements) {
        if (!userTotals[m.userId]) {
          userTotals[m.userId] = { username: m.user.displayName || m.user.username, total: 0 };
        }
        userTotals[m.userId].total += Number(m.distance);
      }

      const sorted = Object.entries(userTotals)
        .sort((a, b) => b[1].total - a[1].total);

      results.push({
        id: category.id,
        name: category.name,
        metric: category.metric,
        rule: category.rule,
        entries: sorted.map(([userId, data]) => ({
          username: data.username,
          value: Math.round(data.total * 10) / 10,
          unit: "mi",
          isCurrentUser: userId === currentUserId,
        })),
      });
    } else {
      // Unknown category — still show it, just empty
      results.push({
        id: category.id,
        name: category.name,
        metric: category.metric,
        rule: category.rule,
        entries: [],
      });
    }
  }

  return NextResponse.json(results);
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
