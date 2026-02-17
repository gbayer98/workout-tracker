import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HomeClient from "./home-client";

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user!.id;
  const userName = session!.user!.name || "User";

  // Check for active session
  const activeSession = await prisma.session.findFirst({
    where: { userId, finishedAt: null },
    include: { workout: true },
  });

  return (
    <HomeClient
      userName={userName}
      activeSessionId={activeSession?.id || null}
      activeSessionWorkoutName={activeSession?.workout.name || null}
    />
  );
}
