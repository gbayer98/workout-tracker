import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import LeaderboardClient from "./leaderboard-client";

export default async function LeaderboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <LeaderboardClient />;
}
