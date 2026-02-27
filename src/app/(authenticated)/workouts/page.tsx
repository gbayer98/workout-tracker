import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkoutsClient from "./workouts-client";

export default async function WorkoutsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id },
    include: {
      workoutLifts: {
        include: { lift: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lifts = await prisma.lift.findMany({
    where: {
      OR: [{ isGlobal: true }, { userId: session.user.id }],
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  // Fetch active session (if any)
  const activeSession = await prisma.session.findFirst({
    where: { userId: session.user.id, finishedAt: null },
    include: {
      workout: { select: { name: true } },
      _count: { select: { sessionSets: true } },
    },
  });

  // Fetch recent completed sessions (last 20)
  const recentSessions = await prisma.session.findMany({
    where: { userId: session.user.id, finishedAt: { not: null } },
    include: {
      workout: { select: { name: true, id: true } },
      _count: { select: { sessionSets: true } },
    },
    orderBy: { finishedAt: "desc" },
    take: 20,
  });

  const serializedActive = activeSession
    ? {
        id: activeSession.id,
        workoutId: activeSession.workoutId,
        workoutName: activeSession.workout?.name ?? activeSession.workoutName ?? "Workout",
        startedAt: activeSession.startedAt.toISOString(),
        setCount: activeSession._count.sessionSets,
      }
    : null;

  const serializedHistory = recentSessions.map((s) => ({
    id: s.id,
    workoutId: s.workoutId,
    workoutName: s.workout?.name ?? s.workoutName ?? "Workout",
    startedAt: s.startedAt.toISOString(),
    finishedAt: s.finishedAt!.toISOString(),
    setCount: s._count.sessionSets,
  }));

  return (
    <WorkoutsClient
      initialWorkouts={workouts}
      availableLifts={lifts}
      activeSession={serializedActive}
      sessionHistory={serializedHistory}
    />
  );
}
