import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await prisma.feedback.updateMany({
    where: { processed: true },
    data: { processed: false },
  });

  return NextResponse.json({
    message: `Reset ${result.count} feedback entries to unprocessed`,
  });
}
