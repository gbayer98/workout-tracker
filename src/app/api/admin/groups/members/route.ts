import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") return null;
  return session.user.id;
}

export async function POST(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { groupId, userId } = await request.json();
  if (!groupId || !userId) {
    return NextResponse.json({ error: "groupId and userId are required" }, { status: 400 });
  }

  const existing = await prisma.userGroup.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (existing) {
    return NextResponse.json({ error: "User already in group" }, { status: 409 });
  }

  await prisma.userGroup.create({
    data: { userId, groupId },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { groupId, userId } = await request.json();
  if (!groupId || !userId) {
    return NextResponse.json({ error: "groupId and userId are required" }, { status: 400 });
  }

  await prisma.userGroup.deleteMany({
    where: { userId, groupId },
  });

  return NextResponse.json({ success: true });
}
