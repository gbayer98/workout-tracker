import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.bodyWeight.findMany({
    where: { userId: session.user.id },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json(
    entries.map((e) => ({
      id: e.id,
      weight: Number(e.weight),
      date: e.recordedAt.toISOString().split("T")[0],
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { weight, date } = body;

  if (!weight || weight <= 0 || weight > 1000) {
    return NextResponse.json(
      { error: "Weight must be between 1 and 1000 lbs" },
      { status: 400 }
    );
  }

  const recordedAt = date ? new Date(date + "T00:00:00Z") : new Date(new Date().toISOString().split("T")[0] + "T00:00:00Z");

  // Reject future dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  if (recordedAt >= tomorrow) {
    return NextResponse.json(
      { error: "Cannot log weight for a future date" },
      { status: 400 }
    );
  }

  // Upsert: one entry per day per user
  const entry = await prisma.bodyWeight.upsert({
    where: {
      userId_recordedAt: {
        userId: session.user.id,
        recordedAt,
      },
    },
    update: { weight },
    create: {
      userId: session.user.id,
      weight,
      recordedAt,
    },
  });

  return NextResponse.json(
    {
      id: entry.id,
      weight: Number(entry.weight),
      date: entry.recordedAt.toISOString().split("T")[0],
    },
    { status: 201 }
  );
}
