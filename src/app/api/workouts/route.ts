import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id },
    include: {
      workoutLifts: {
        include: { lift: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(workouts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, liftIds } = body as { name: string; liftIds: string[] };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.trim().length > 100) {
    return NextResponse.json(
      { error: "Workout name must be 100 characters or fewer" },
      { status: 400 }
    );
  }
  if (!liftIds || liftIds.length === 0) {
    return NextResponse.json(
      { error: "Select at least one lift" },
      { status: 400 }
    );
  }

  const workout = await prisma.workout.create({
    data: {
      name: name.trim(),
      userId: session.user.id,
      workoutLifts: {
        create: liftIds.map((liftId, index) => ({
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

  return NextResponse.json(workout, { status: 201 });
}
