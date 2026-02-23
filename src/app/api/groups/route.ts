import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: {
      members: {
        where: { userId: session.user.id },
        select: { id: true },
      },
      _count: { select: { members: true } },
    },
  });

  return NextResponse.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      memberCount: g._count.members,
      isMember: g.members.length > 0,
    }))
  );
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();
  const { groupIds } = body;

  if (!Array.isArray(groupIds)) {
    return NextResponse.json(
      { error: "groupIds must be an array" },
      { status: 400 }
    );
  }

  // Verify all groups exist
  const groups = await prisma.group.findMany({
    where: { id: { in: groupIds } },
  });
  if (groups.length !== groupIds.length) {
    return NextResponse.json(
      { error: "One or more groups not found" },
      { status: 400 }
    );
  }

  // Replace user's group memberships in a transaction
  await prisma.$transaction([
    prisma.userGroup.deleteMany({ where: { userId } }),
    ...groupIds.map((groupId: string) =>
      prisma.userGroup.create({
        data: { userId, groupId },
      })
    ),
  ]);

  return NextResponse.json({ success: true });
}
