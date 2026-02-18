import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcrypt";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (admin?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, newPassword } = body;

  if (!userId || !newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: "User ID and password (8+ chars) required" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const hashed = await hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return NextResponse.json({ success: true });
}
