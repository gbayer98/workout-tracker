import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { liftId } = await request.json();

  if (!liftId) {
    return NextResponse.json({ error: "liftId is required" }, { status: 400 });
  }

  // Verify the lift exists and belongs to user or is global
  const lift = await prisma.lift.findUnique({ where: { id: liftId } });
  if (!lift || (lift.userId && lift.userId !== session.user.id)) {
    return NextResponse.json({ error: "Lift not found" }, { status: 404 });
  }

  // Check no active session exists
  const activeSession = await prisma.session.findFirst({
    where: { userId: session.user.id, finishedAt: null },
  });

  if (activeSession) {
    return NextResponse.json(
      { error: "You already have an active session", sessionId: activeSession.id },
      { status: 409 }
    );
  }

  // Create a temporary workout + session in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const workout = await tx.workout.create({
      data: {
        name: `Quick: ${lift.name}`,
        userId: session.user!.id!,
        workoutLifts: {
          create: [{ liftId, order: 0 }],
        },
      },
    });

    const newSession = await tx.session.create({
      data: {
        userId: session.user!.id!,
        workoutId: workout.id,
        workoutName: `Quick: ${lift.name}`,
      },
    });

    return newSession;
  });

  return NextResponse.json(result, { status: 201 });
}
