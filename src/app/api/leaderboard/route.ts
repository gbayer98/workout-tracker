import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = session.user.id;

  // Get the groups the current user belongs to
  const userGroups = await prisma.userGroup.findMany({
    where: { userId: currentUserId },
    select: { groupId: true },
  });
  const groupIds = userGroups.map((ug) => ug.groupId);

  // Get all user IDs that share at least one group (union, no dupes)
  let visibleUserIds: string[];
  if (groupIds.length === 0) {
    visibleUserIds = [currentUserId];
  } else {
    const groupMembers = await prisma.userGroup.findMany({
      where: { groupId: { in: groupIds } },
      select: { userId: true },
      distinct: ["userId"],
    });
    visibleUserIds = groupMembers.map((m) => m.userId);
  }

  // Rename legacy category if it exists
  await prisma.leaderboardCategory.updateMany({
    where: { name: "Total Miles Moved" },
    data: {
      name: "Miles This Month",
      metric: "Monthly distance",
      rule: "Total miles logged across all runs and walks this calendar month",
      displayOrder: 8,
    },
  });

  // Replace legacy names with "Freak Athlete of the Month"
  await prisma.leaderboardCategory.updateMany({
    where: { name: { in: ["Workouts This Week", "Freak Athlete"] } },
    data: {
      name: "Freak Athlete of the Month",
      liftName: null,
      metric: "Total mass moved + total feet ran this month",
      rule: "Sum of (weight x reps) for all sets plus (miles x 5280) for all runs this calendar month",
      displayOrder: 1,
    },
  });

  // Deduplicate: keep only one "Freak Athlete of the Month" row
  const freakRows = await prisma.leaderboardCategory.findMany({
    where: { name: "Freak Athlete of the Month" },
    orderBy: { id: "asc" },
  });
  if (freakRows.length > 1) {
    const idsToDelete = freakRows.slice(1).map((r) => r.id);
    await prisma.leaderboardCategory.deleteMany({
      where: { id: { in: idsToDelete } },
    });
  } else if (freakRows.length === 0) {
    await prisma.leaderboardCategory.create({
      data: {
        name: "Freak Athlete of the Month",
        metric: "Total mass moved + total feet ran this month",
        rule: "Sum of (weight x reps) for all sets plus (miles x 5280) for all runs this calendar month",
        displayOrder: 1,
      },
    });
  }

  // Ensure other categories exist
  const ensureCategories = [
    {
      name: "Pull-Ups",
      liftName: "Pull-Up",
      metric: "Max reps in a single set",
      rule: "Most pull-ups completed in a single set",
      displayOrder: 5,
    },
    {
      name: "Romanian Deadlift",
      liftName: "Romanian Deadlift",
      metric: "Max weight with at least 3 reps",
      rule: "Heaviest weight where you completed 3 or more reps in a single set",
      displayOrder: 6,
    },
  ];
  for (const cat of ensureCategories) {
    const exists = await prisma.leaderboardCategory.findFirst({
      where: { name: cat.name },
    });
    if (!exists) {
      await prisma.leaderboardCategory.create({ data: cat });
    }
  }

  const categories = await prisma.leaderboardCategory.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const monthStart = getMonthStart(new Date());

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
    if (category.name === "Freak Athlete of the Month") {
      // Total mass moved (weight * reps) + total feet ran (miles * 5280), this month
      const sets = await prisma.sessionSet.findMany({
        where: {
          session: {
            finishedAt: { not: null },
            startedAt: { gte: monthStart },
            userId: { in: visibleUserIds },
          },
        },
        include: { session: { include: { user: true } }, lift: true },
      });

      const movements = await prisma.movement.findMany({
        where: {
          date: { gte: monthStart },
          type: "RUN",
          userId: { in: visibleUserIds },
        },
        include: { user: true },
      });

      const userScores: Record<string, { username: string; score: number }> = {};

      for (const s of sets) {
        const uid = s.session.userId;
        if (!userScores[uid]) {
          userScores[uid] = {
            username: s.session.user.displayName || s.session.user.username,
            score: 0,
          };
        }
        const multiplier = s.lift.perSide ? 2 : 1;
        userScores[uid].score += Number(s.weight) * multiplier * s.reps;
      }

      for (const m of movements) {
        const uid = m.userId;
        if (!userScores[uid]) {
          userScores[uid] = {
            username: m.user.displayName || m.user.username,
            score: 0,
          };
        }
        userScores[uid].score += Number(m.distance) * 5280;
      }

      const sorted = Object.entries(userScores)
        .sort((a, b) => b[1].score - a[1].score);

      results.push({
        id: category.id,
        name: category.name,
        metric: category.metric,
        rule: category.rule,
        entries: sorted.map(([userId, data]) => ({
          username: data.username,
          value: Math.round(data.score),
          unit: "pts",
          isCurrentUser: userId === currentUserId,
        })),
      });
    } else if (
      category.liftName === "Bench Press" ||
      category.liftName === "Squat" ||
      category.liftName === "Romanian Deadlift"
    ) {
      const lift = await prisma.lift.findFirst({
        where: { name: category.liftName, isGlobal: true },
      });

      if (!lift) {
        results.push({ id: category.id, name: category.name, metric: category.metric, rule: category.rule, entries: [] });
        continue;
      }

      const qualifyingSets = await prisma.sessionSet.findMany({
        where: {
          liftId: lift.id,
          reps: { gte: 3 },
          session: { finishedAt: { not: null }, userId: { in: visibleUserIds } },
        },
        include: { session: { include: { user: true } } },
        orderBy: { weight: "desc" },
      });

      const userBest: Record<string, { username: string; weight: number; date: string }> = {};
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

      const sorted = Object.entries(userBest).sort((a, b) => b[1].weight - a[1].weight);

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
    } else if (category.liftName === "Push-Up" || category.liftName === "Pull-Up") {
      const lift = await prisma.lift.findFirst({
        where: { name: category.liftName!, isGlobal: true },
      });

      if (!lift) {
        results.push({ id: category.id, name: category.name, metric: category.metric, rule: category.rule, entries: [] });
        continue;
      }

      const sets = await prisma.sessionSet.findMany({
        where: {
          liftId: lift.id,
          session: { finishedAt: { not: null }, userId: { in: visibleUserIds } },
        },
        include: { session: { include: { user: true } } },
        orderBy: { reps: "desc" },
      });

      const userBest: Record<string, { username: string; reps: number; date: string }> = {};
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

      const sorted = Object.entries(userBest).sort((a, b) => b[1].reps - a[1].reps);

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
    } else if (category.name === "Miles This Month") {
      const movements = await prisma.movement.findMany({
        where: { date: { gte: monthStart }, userId: { in: visibleUserIds } },
        include: { user: true },
      });

      const userTotals: Record<string, { username: string; total: number }> = {};
      for (const m of movements) {
        if (!userTotals[m.userId]) {
          userTotals[m.userId] = { username: m.user.displayName || m.user.username, total: 0 };
        }
        userTotals[m.userId].total += Number(m.distance);
      }

      const sorted = Object.entries(userTotals).sort((a, b) => b[1].total - a[1].total);

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
      results.push({ id: category.id, name: category.name, metric: category.metric, rule: category.rule, entries: [] });
    }
  }

  return NextResponse.json(results);
}

function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
