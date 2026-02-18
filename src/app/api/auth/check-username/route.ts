import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username || username.length < 3) {
    return NextResponse.json({ available: false });
  }

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  return NextResponse.json({ available: !existing });
}
