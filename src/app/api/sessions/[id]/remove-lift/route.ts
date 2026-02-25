import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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

  if (!workoutSession.workout) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  if (workoutSession.workout.workoutLifts.length <= 1) {
    return NextResponse.json({ error: "Cannot remove the last lift" }, { status: 400 });
  }

  const workoutLift = workoutSession.workout.workoutLifts.find(
    (wl) => wl.liftId === liftId
  );
  if (!workoutLift) {
    return NextResponse.json({ error: "Lift not in this workout" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.sessionSet.deleteMany({
      where: { sessionId: id, liftId },
    }),
    prisma.workoutLift.delete({
      where: { id: workoutLift.id },
    }),
  ]);

  return NextResponse.json({ success: true });
}
