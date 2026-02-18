import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);

  // Total users
  const totalUsers = await prisma.user.count();

  // Weekly active users (users with lastActiveAt in last 7 days)
  const weeklyActiveUsers = await prisma.user.count({
    where: { lastActiveAt: { gte: sevenDaysAgo } },
  });

  // Total workouts completed
  const totalWorkoutsCompleted = await prisma.session.count({
    where: { finishedAt: { not: null } },
  });

  // Workouts this week
  const workoutsThisWeek = await prisma.session.count({
    where: {
      finishedAt: { not: null },
      startedAt: { gte: sevenDaysAgo },
    },
  });

  // Total mass moved (all users, all time)
  const allStrengthSets = await prisma.sessionSet.findMany({
    where: {
      session: { finishedAt: { not: null } },
      lift: { type: "STRENGTH" },
    },
    select: { weight: true, reps: true },
  });
  const totalMassMoved = allStrengthSets.reduce(
    (sum, s) => sum + Number(s.weight) * s.reps,
    0
  );

  // Most popular lifts (by number of sets logged)
  const popularLifts = await prisma.sessionSet.groupBy({
    by: ["liftId"],
    where: { session: { finishedAt: { not: null } } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 5,
  });
  const liftIds = popularLifts.map((p) => p.liftId);
  const lifts = await prisma.lift.findMany({
    where: { id: { in: liftIds } },
    select: { id: true, name: true },
  });
  const liftMap = new Map(lifts.map((l) => [l.id, l.name]));
  const topLifts = popularLifts.map((p) => ({
    name: liftMap.get(p.liftId) || "Unknown",
    sets: p._count.id,
  }));

  // User list
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      createdAt: true,
      lastActiveAt: true,
      _count: {
        select: {
          sessions: { where: { finishedAt: { not: null } } },
        },
      },
    },
  });

  return NextResponse.json({
    stats: {
      totalUsers,
      weeklyActiveUsers,
      totalWorkoutsCompleted,
      workoutsThisWeek,
      totalMassMoved: Math.round(totalMassMoved),
      topLifts,
    },
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      createdAt: u.createdAt.toISOString().split("T")[0],
      lastActiveAt: u.lastActiveAt.toISOString().split("T")[0],
      workouts: u._count.sessions,
    })),
  });
}
