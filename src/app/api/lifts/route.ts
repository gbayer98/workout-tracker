import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lifts = await prisma.lift.findMany({
    where: {
      OR: [{ isGlobal: true }, { userId: session.user.id }],
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(lifts);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, muscleGroup, type } = body;

  if (!name || !muscleGroup) {
    return NextResponse.json(
      { error: "Name and muscle group are required" },
      { status: 400 }
    );
  }

  const validTypes = ["STRENGTH", "BODYWEIGHT", "ENDURANCE"];
  const liftType = validTypes.includes(type) ? type : "STRENGTH";

  const lift = await prisma.lift.create({
    data: {
      name,
      muscleGroup,
      type: liftType,
      isGlobal: false,
      userId: session.user.id,
    },
  });

  return NextResponse.json(lift, { status: 201 });
}
