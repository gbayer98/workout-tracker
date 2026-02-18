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

  const trimmedName = name?.trim();
  const trimmedGroup = muscleGroup?.trim();

  if (!trimmedName || !trimmedGroup) {
    return NextResponse.json(
      { error: "Name and muscle group are required" },
      { status: 400 }
    );
  }

  if (trimmedName.length > 100) {
    return NextResponse.json(
      { error: "Lift name must be 100 characters or fewer" },
      { status: 400 }
    );
  }

  const validGroups = ["Arms", "Back", "Chest", "Core", "Legs", "Shoulders"];
  if (!validGroups.includes(trimmedGroup)) {
    return NextResponse.json(
      { error: "Invalid muscle group" },
      { status: 400 }
    );
  }

  const validTypes = ["STRENGTH", "BODYWEIGHT", "ENDURANCE"];
  const liftType = validTypes.includes(type) ? type : "STRENGTH";

  const lift = await prisma.lift.create({
    data: {
      name: trimmedName,
      muscleGroup: trimmedGroup,
      type: liftType,
      isGlobal: false,
      userId: session.user.id,
    },
  });

  return NextResponse.json(lift, { status: 201 });
}
