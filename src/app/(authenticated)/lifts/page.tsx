import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LiftsClient from "./lifts-client";

export default async function LiftsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const lifts = await prisma.lift.findMany({
    where: {
      OR: [{ isGlobal: true }, { userId: session.user.id }],
    },
    orderBy: [{ muscleGroup: "asc" }, { name: "asc" }],
  });

  return <LiftsClient initialLifts={lifts} />;
}
