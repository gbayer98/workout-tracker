import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WeightClient from "./weight-client";

export default async function WeightPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const entries = await prisma.bodyWeight.findMany({
    where: { userId: session.user.id },
    orderBy: { recordedAt: "asc" },
  });

  const serialized = entries.map((e) => ({
    id: e.id,
    weight: Number(e.weight),
    date: e.recordedAt.toISOString().split("T")[0],
  }));

  return <WeightClient initialEntries={serialized} />;
}
