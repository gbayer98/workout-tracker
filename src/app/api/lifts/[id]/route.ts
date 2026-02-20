import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const lift = await prisma.lift.findUnique({ where: { id } });
  if (!lift) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only allow deleting custom lifts that belong to the user
  if (lift.isGlobal || lift.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Cannot delete this lift" },
      { status: 403 }
    );
  }

  // Check if lift is used in any session sets
  const usedInSessions = await prisma.sessionSet.count({
    where: { liftId: id },
  });
  if (usedInSessions > 0) {
    return NextResponse.json(
      { error: "Cannot delete — this lift has logged session data. Remove it from workouts instead." },
      { status: 409 }
    );
  }

  // Delete workout lift references first, then the lift
  await prisma.$transaction(async (tx) => {
    await tx.workoutLift.deleteMany({ where: { liftId: id } });
    await tx.lift.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
