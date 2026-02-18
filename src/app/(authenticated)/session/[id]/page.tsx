import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SessionClient from "./session-client";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const workoutSession = await prisma.session.findUnique({
    where: { id },
    include: {
      workout: {
        include: {
          workoutLifts: {
            include: { lift: true },
            orderBy: { order: "asc" },
          },
        },
      },
      sessionSets: {
        orderBy: [{ liftId: "asc" }, { setNumber: "asc" }],
      },
    },
  });

  if (!workoutSession || workoutSession.userId !== session.user.id) {
    redirect("/home");
  }

  if (workoutSession.finishedAt) {
    redirect("/home");
  }

  // Get last recorded values for each lift
  const liftIds = workoutSession.workout.workoutLifts.map((wl) => wl.liftId);

  const lastSets = await prisma.sessionSet.findMany({
    where: {
      liftId: { in: liftIds },
      session: {
        userId: session.user.id,
        finishedAt: { not: null },
        id: { not: id },
      },
    },
    orderBy: { session: { startedAt: "desc" } },
    include: { session: true },
  });

  const lastByLift: Record<string, { weight: number; reps: number }> = {};
  for (const set of lastSets) {
    if (!lastByLift[set.liftId]) {
      lastByLift[set.liftId] = {
        weight: Number(set.weight),
        reps: set.reps,
      };
    }
  }

  // Get the full set breakdown from the last session of the same workout
  const lastWorkoutSession = await prisma.session.findFirst({
    where: {
      userId: session.user.id,
      workoutId: workoutSession.workoutId,
      finishedAt: { not: null },
      id: { not: id },
    },
    orderBy: { startedAt: "desc" },
    include: {
      sessionSets: {
        orderBy: [{ liftId: "asc" }, { setNumber: "asc" }],
      },
    },
  });

  // Group last session sets by lift
  const lastSessionSetsByLift: Record<
    string,
    Array<{ weight: number; reps: number; duration: number | null; setNumber: number }>
  > = {};
  if (lastWorkoutSession) {
    for (const s of lastWorkoutSession.sessionSets) {
      if (!lastSessionSetsByLift[s.liftId]) lastSessionSetsByLift[s.liftId] = [];
      lastSessionSetsByLift[s.liftId].push({
        weight: Number(s.weight),
        reps: s.reps,
        duration: s.duration,
        setNumber: s.setNumber,
      });
    }
  }

  const serialized = {
    ...workoutSession,
    startedAt: workoutSession.startedAt.toISOString(),
    sessionSets: workoutSession.sessionSets.map((s) => ({
      ...s,
      weight: Number(s.weight),
      duration: s.duration ?? undefined,
      createdAt: s.createdAt.toISOString(),
    })),
  };

  return (
    <SessionClient
      session={serialized}
      lastByLift={lastByLift}
      lastSessionSets={lastSessionSetsByLift}
    />
  );
}
