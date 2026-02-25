import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SessionClient from "./session-client";
import SessionEditClient from "./session-edit-client";

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
        include: { lift: true },
        orderBy: [{ liftId: "asc" }, { setNumber: "asc" }],
      },
    },
  });

  if (!workoutSession || workoutSession.userId !== session.user.id) {
    redirect("/home");
  }

  // Finished session — show editable review page
  if (workoutSession.finishedAt) {
    // If workout was deleted, build synthetic workout data from session sets
    let workout = workoutSession.workout;
    if (!workout) {
      const uniqueLifts = new Map<string, typeof workoutSession.sessionSets[0]["lift"]>();
      for (const s of workoutSession.sessionSets) {
        if (!uniqueLifts.has(s.liftId)) uniqueLifts.set(s.liftId, s.lift);
      }
      workout = {
        id: "deleted",
        name: workoutSession.workoutName ?? "Deleted Workout",
        userId: workoutSession.userId,
        createdAt: workoutSession.startedAt,
        workoutLifts: Array.from(uniqueLifts.entries()).map(([liftId, lift], i) => ({
          id: `synthetic-${liftId}`,
          workoutId: "deleted",
          liftId,
          order: i,
          lift,
        })),
      };
    }

    const serialized = {
      ...workoutSession,
      workout,
      startedAt: workoutSession.startedAt.toISOString(),
      finishedAt: workoutSession.finishedAt.toISOString(),
      sessionSets: workoutSession.sessionSets.map((s) => ({
        ...s,
        weight: Number(s.weight),
        duration: s.duration ?? undefined,
        createdAt: s.createdAt.toISOString(),
      })),
    };
    return <SessionEditClient session={serialized} />;
  }

  // Active session — workout must exist (unfinished sessions for deleted workouts are cleaned up)
  if (!workoutSession.workout) {
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
  const lastWorkoutSession = workoutSession.workoutId ? await prisma.session.findFirst({
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
  }) : null;

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
    workout: workoutSession.workout!,
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
