import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const feedback = await prisma.feedback.findMany({
    include: {
      user: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    feedback.map((f) => ({
      id: f.id,
      message: f.message,
      username: f.user.displayName || f.user.username,
      createdAt: f.createdAt.toISOString(),
    }))
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { message } = body;

  const trimmed = message?.trim();
  if (!trimmed) {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 }
    );
  }

  if (trimmed.length > 1000) {
    return NextResponse.json(
      { error: "Feedback must be 1000 characters or fewer" },
      { status: 400 }
    );
  }

  await prisma.feedback.create({
    data: {
      userId: session.user.id,
      message: trimmed,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
