import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { workoutId } = body;

  if (!workoutId) {
    return NextResponse.json(
      { error: "Workout ID is required" },
      { status: 400 }
    );
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

  const newSession = await prisma.session.create({
    data: {
      userId: session.user.id,
      workoutId,
    },
  });

  return NextResponse.json(newSession, { status: 201 });
}
