import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const movements = await prisma.movement.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  const now = new Date();
  const weekStart = getWeekStart(now);

  // Stats calculations
  const thisWeek = movements.filter((m) => m.date >= weekStart);
  const distanceThisWeek = thisWeek.reduce(
    (sum, m) => sum + Number(m.distance),
    0
  );

  const totalDistance = movements.reduce(
    (sum, m) => sum + Number(m.distance),
    0
  );

  const runs = movements.filter((m) => m.type === "RUN");
  const walks = movements.filter((m) => m.type === "WALK");

  const longestRun = runs.length > 0
    ? Math.max(...runs.map((m) => Number(m.distance)))
    : 0;

  const avgDistance = movements.length > 0
    ? totalDistance / movements.length
    : 0;

  const totalRuns = runs.reduce((sum, m) => sum + Number(m.distance), 0);
  const totalWalks = walks.reduce((sum, m) => sum + Number(m.distance), 0);

  // Weekly distance trend (last 8 weeks)
  const weeklyTrend: Array<{ weekLabel: string; distance: number }> = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(weekStart);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);

    const weekMovements = movements.filter(
      (m) => m.date >= ws && m.date < we
    );
    const dist = weekMovements.reduce(
      (sum, m) => sum + Number(m.distance),
      0
    );

    const monthDay = `${ws.getMonth() + 1}/${ws.getDate()}`;
    weeklyTrend.push({ weekLabel: monthDay, distance: Math.round(dist * 10) / 10 });
  }

  return NextResponse.json({
    movements: movements.map((m) => ({
      id: m.id,
      type: m.type,
      distance: Number(m.distance),
      duration: m.duration,
      date: m.date.toISOString().split("T")[0],
    })),
    stats: {
      distanceThisWeek: Math.round(distanceThisWeek * 10) / 10,
      totalDistance: Math.round(totalDistance * 10) / 10,
      longestRun: Math.round(longestRun * 10) / 10,
      avgDistance: Math.round(avgDistance * 10) / 10,
      totalRuns: Math.round(totalRuns * 10) / 10,
      totalWalks: Math.round(totalWalks * 10) / 10,
      count: movements.length,
    },
    weeklyTrend,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, distance, duration, date } = body;

  if (!type || !distance) {
    return NextResponse.json(
      { error: "Type and distance are required" },
      { status: 400 }
    );
  }

  if (!["RUN", "WALK"].includes(type)) {
    return NextResponse.json(
      { error: "Type must be RUN or WALK" },
      { status: 400 }
    );
  }

  const movement = await prisma.movement.create({
    data: {
      userId: session.user.id,
      type,
      distance: parseFloat(distance),
      duration: duration ? parseInt(duration) : null,
      date: date ? new Date(date) : new Date(),
    },
  });

  return NextResponse.json(
    {
      id: movement.id,
      type: movement.type,
      distance: Number(movement.distance),
      duration: movement.duration,
      date: movement.date.toISOString().split("T")[0],
    },
    { status: 201 }
  );
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
