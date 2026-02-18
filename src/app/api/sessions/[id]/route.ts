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
