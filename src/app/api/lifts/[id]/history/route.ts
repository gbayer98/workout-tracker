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

  const lift = await prisma.lift.findUnique({ where: { id }, select: { type: true } });

  const sets = await prisma.sessionSet.findMany({
    where: {
      liftId: id,
      session: { userId: session.user.id, finishedAt: { not: null } },
    },
    include: { session: true },
    orderBy: { session: { startedAt: "asc" } },
  });

  // Aggregate by session date based on lift type
  const bySession = new Map<string, { date: string; weight: number; reps: number; duration: number }>();

  for (const set of sets) {
    const dateKey = set.session.startedAt.toISOString().split("T")[0];
    const existing = bySession.get(dateKey);
    const weight = Number(set.weight);
    const reps = set.reps;
    const duration = set.duration ?? 0;

    if (!existing) {
      bySession.set(dateKey, { date: dateKey, weight, reps, duration });
    } else {
      if (lift?.type === "ENDURANCE") {
        if (duration > existing.duration) existing.duration = duration;
      } else {
        if (weight > existing.weight) existing.weight = weight;
        if (reps > existing.reps) existing.reps = reps;
      }
    }
  }

  return NextResponse.json(Array.from(bySession.values()));
}
