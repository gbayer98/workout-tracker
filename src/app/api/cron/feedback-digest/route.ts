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

  // Format feedback for the AI
  const feedbackText = feedback
    .map((f) => {
      const name = f.user.displayName || f.user.username;
      const date = f.createdAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `- [${name}, ${date}]: ${f.message}`;
    })
    .join("\n");

  // Generate AI summary
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a product manager analyzing user feedback for a workout tracking app. Here are ${feedback.length} new feedback entries:\n\n${feedbackText}\n\nCreate a concise digest with:\n1. **Summary** — 2-3 sentence overview of the feedback themes\n2. **Feature Requests** — Grouped and deduplicated list with how many users requested each\n3. **Bug Reports** — Any issues users reported\n4. **Priority Recommendation** — Which items to address first and why\n\nKeep it brief and actionable. Use plain text formatting suitable for email.`,
      },
    ],
  });

  const summary =
    response.content[0].type === "text"
      ? response.content[0].text
      : "Failed to generate summary";

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
    text: `${summary}\n\n---\nRaw Feedback (${feedback.length} entries):\n\n${feedbackText}`,
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
