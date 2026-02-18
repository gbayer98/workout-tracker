import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  // Get the most recent set for each lift
  const lastByLift: Record<string, { weight: number; reps: number }> = {};
  for (const set of lastSets) {
    if (!lastByLift[set.liftId]) {
      lastByLift[set.liftId] = {
        weight: Number(set.weight),
        reps: set.reps,
      };
    }
  }

  return NextResponse.json({
    ...workoutSession,
    lastByLift,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { sets, finish } = body as {
    sets: Array<{
      liftId: string;
      setNumber: number;
      weight: number;
      reps: number;
      duration?: number;
    }>;
    finish?: boolean;
  };

  const workoutSession = await prisma.session.findUnique({ where: { id } });
  if (!workoutSession || workoutSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Save sets in a transaction
  await prisma.$transaction(async (tx) => {
    // Delete existing sets and re-create (simpler than upsert)
    await tx.sessionSet.deleteMany({ where: { sessionId: id } });

    if (sets && sets.length > 0) {
      await tx.sessionSet.createMany({
        data: sets.map((s) => ({
          sessionId: id,
          liftId: s.liftId,
          setNumber: s.setNumber,
          weight: s.weight || 0,
          reps: s.reps || 0,
          duration: s.duration || null,
        })),
      });
    }

    if (finish) {
      await tx.session.update({
        where: { id },
        data: { finishedAt: new Date() },
      });
    }
  });

  if (finish) {
    const finishedSession = await prisma.session.findUnique({
      where: { id },
      include: {
        workout: true,
        sessionSets: { include: { lift: true } },
      },
    });

    if (finishedSession) {
      const durationMs =
        finishedSession.finishedAt!.getTime() - finishedSession.startedAt.getTime();
      const durationMin = Math.round(durationMs / 60000);
      const totalSets = finishedSession.sessionSets.length;

      const massMoved = finishedSession.sessionSets.reduce((sum, s) => {
        if (s.lift.type === "STRENGTH") return sum + Number(s.weight) * s.reps;
        return sum;
      }, 0);

      const bodyweightReps = finishedSession.sessionSets.reduce((sum, s) => {
        if (s.lift.type === "BODYWEIGHT") return sum + s.reps;
        return sum;
      }, 0);

      // Check leaderboard positions
      const leaderboardPositions: Array<{
        category: string;
        position: number;
        value: string;
      }> = [];

      const categories = await prisma.leaderboardCategory.findMany();
      for (const cat of categories) {
        if (cat.liftName === "Bench Press" || cat.liftName === "Squat") {
          const lift = await prisma.lift.findFirst({
            where: { name: cat.liftName, isGlobal: true },
          });
          if (!lift) continue;

          const qualifyingSet = finishedSession.sessionSets
            .filter((s) => s.liftId === lift.id && s.reps >= 3)
            .sort((a, b) => Number(b.weight) - Number(a.weight))[0];
          if (!qualifyingSet) continue;

          const allSets = await prisma.sessionSet.findMany({
            where: {
              liftId: lift.id,
              reps: { gte: 3 },
              session: { finishedAt: { not: null } },
            },
            include: { session: true },
          });

          const userBest: Record<string, number> = {};
          for (const s of allSets) {
            const w = Number(s.weight);
            if (!userBest[s.session.userId] || w > userBest[s.session.userId]) {
              userBest[s.session.userId] = w;
            }
          }

          const sorted = Object.entries(userBest).sort((a, b) => b[1] - a[1]);
          const pos = sorted.findIndex(([uid]) => uid === session.user!.id) + 1;
          if (pos > 0 && pos <= 3) {
            leaderboardPositions.push({
              category: cat.name,
              position: pos,
              value: `${Number(qualifyingSet.weight)} lbs`,
            });
          }
        } else if (cat.liftName === "Push-Up") {
          const lift = await prisma.lift.findFirst({
            where: { name: "Push-Up", isGlobal: true },
          });
          if (!lift) continue;

          const bestPushUp = finishedSession.sessionSets
            .filter((s) => s.liftId === lift.id)
            .sort((a, b) => b.reps - a.reps)[0];
          if (!bestPushUp) continue;

          const allSets = await prisma.sessionSet.findMany({
            where: {
              liftId: lift.id,
              session: { finishedAt: { not: null } },
            },
            include: { session: true },
          });

          const userBest: Record<string, number> = {};
          for (const s of allSets) {
            if (!userBest[s.session.userId] || s.reps > userBest[s.session.userId]) {
              userBest[s.session.userId] = s.reps;
            }
          }

          const sorted = Object.entries(userBest).sort((a, b) => b[1] - a[1]);
          const pos = sorted.findIndex(([uid]) => uid === session.user!.id) + 1;
          if (pos > 0 && pos <= 3) {
            leaderboardPositions.push({
              category: cat.name,
              position: pos,
              value: `${bestPushUp.reps} reps`,
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          workoutName: finishedSession.workout.name,
          durationMin,
          totalSets,
          massMoved: Math.round(massMoved),
          bodyweightReps,
          leaderboardPositions,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const workoutSession = await prisma.session.findUnique({ where: { id } });
  if (!workoutSession || workoutSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.session.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
