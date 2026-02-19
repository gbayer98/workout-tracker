import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getResend } from "@/lib/resend";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch unprocessed feedback
  const feedback = await prisma.feedback.findMany({
    where: { processed: false },
    include: {
      user: { select: { username: true, displayName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (feedback.length === 0) {
    return NextResponse.json({ message: "No new feedback" });
  }

  // Format feedback entries
  const feedbackLines = feedback.map((f) => {
    const name = f.user.displayName || f.user.username;
    const date = f.createdAt.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return `- [${name}] (${date})\n  ${f.message}`;
  });

  const emailBody = [
    `Workout Tracker — ${feedback.length} new feedback ${feedback.length === 1 ? "entry" : "entries"}`,
    "",
    ...feedbackLines,
    "",
    "---",
    "View all feedback at /admin",
  ].join("\n");

  // Send email
  const emailTo = process.env.DIGEST_EMAIL;
  if (!emailTo) {
    return NextResponse.json(
      { error: "DIGEST_EMAIL not configured" },
      { status: 500 }
    );
  }

  await getResend().emails.send({
    from: "Workout Tracker <onboarding@resend.dev>",
    to: emailTo,
    subject: `Feedback Digest — ${feedback.length} new ${feedback.length === 1 ? "entry" : "entries"}`,
    text: emailBody,
  });

  // Mark feedback as processed
  await prisma.feedback.updateMany({
    where: { id: { in: feedback.map((f) => f.id) } },
    data: { processed: true },
  });

  return NextResponse.json({
    message: `Digest sent with ${feedback.length} entries`,
  });
}
