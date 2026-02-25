import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const { name, liftIds } = body as { name: string; liftIds: string[] };

  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout || workout.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!liftIds || liftIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one lift" },
      { status: 400 }
    );
  }

  const trimmedName = name?.trim();
  if (trimmedName && trimmedName.length > 100) {
    return NextResponse.json(
      { error: "Workout name must be 100 characters or fewer" },
      { status: 400 }
    );
  }

  // Update workout in a transaction: update name, delete old lifts, create new ones
  const updated = await prisma.$transaction(async (tx) => {
    await tx.workoutLift.deleteMany({ where: { workoutId: id } });

    return tx.workout.update({
      where: { id },
      data: {
        name: trimmedName || workout.name,
        workoutLifts: {
          create: (liftIds || []).map((liftId, index) => ({
            liftId,
            order: index,
          })),
        },
      },
      include: {
        workoutLifts: {
          include: { lift: true },
          orderBy: { order: "asc" },
        },
      },
    });
  });

  return NextResponse.json(updated);
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

  const workout = await prisma.workout.findUnique({ where: { id } });
  if (!workout || workout.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Preserve session history: stamp workout name on sessions, then null out the FK
  await prisma.$transaction(async (tx) => {
    // Save workout name on finished sessions so history is preserved
    await tx.session.updateMany({
      where: { workoutId: id, finishedAt: { not: null } },
      data: { workoutName: workout.name, workoutId: null },
    });

    // Delete any unfinished sessions (incomplete = no history to preserve)
    const unfinished = await tx.session.findMany({
      where: { workoutId: id, finishedAt: null },
      select: { id: true },
    });
    if (unfinished.length > 0) {
      await tx.sessionSet.deleteMany({
        where: { sessionId: { in: unfinished.map((s) => s.id) } },
      });
      await tx.session.deleteMany({
        where: { id: { in: unfinished.map((s) => s.id) } },
      });
    }

    // Delete workout lifts and workout
    await tx.workoutLift.deleteMany({ where: { workoutId: id } });
    await tx.workout.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
