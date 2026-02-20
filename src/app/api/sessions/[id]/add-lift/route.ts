import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { liftId } = await request.json();

  if (!liftId) {
    return NextResponse.json({ error: "liftId is required" }, { status: 400 });
  }

  const workoutSession = await prisma.session.findUnique({
    where: { id },
    include: { workout: { include: { workoutLifts: true } } },
  });

  if (!workoutSession || workoutSession.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (workoutSession.finishedAt) {
    return NextResponse.json({ error: "Session already finished" }, { status: 400 });
  }

  // Check if lift is already in the workout
  const alreadyInWorkout = workoutSession.workout.workoutLifts.some(
    (wl) => wl.liftId === liftId
  );
  if (alreadyInWorkout) {
    return NextResponse.json({ error: "Lift already in this workout" }, { status: 409 });
  }

  const maxOrder = workoutSession.workout.workoutLifts.reduce(
    (max, wl) => Math.max(max, wl.order),
    0
  );

  const workoutLift = await prisma.workoutLift.create({
    data: {
      workoutId: workoutSession.workoutId,
      liftId,
      order: maxOrder + 1,
    },
  });

  return NextResponse.json({ workoutLift }, { status: 201 });
}
