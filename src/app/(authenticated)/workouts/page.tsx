import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WorkoutsClient from "./workouts-client";

export default async function WorkoutsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workouts = await prisma.workout.findMany({
    where: { userId: session.user.id },
    include: {
      workoutLifts: {
        include: { lift: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lifts = await prisma.lift.findMany({
    where: {
      OR: [{ isGlobal: true }, { userId: session.user.id }],
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  return <WorkoutsClient initialWorkouts={workouts} availableLifts={lifts} />;
}
