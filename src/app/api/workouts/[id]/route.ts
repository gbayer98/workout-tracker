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

  // Update workout in a transaction: update name, delete old lifts, create new ones
  const updated = await prisma.$transaction(async (tx) => {
    await tx.workoutLift.deleteMany({ where: { workoutId: id } });

    return tx.workout.update({
      where: { id },
      data: {
        name: name?.trim() || workout.name,
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

  await prisma.workout.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
