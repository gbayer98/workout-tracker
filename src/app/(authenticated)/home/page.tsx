import { auth } from "@/lib/auth";
import HomeClient from "./home-client";

export default async function HomePage() {
  const session = await auth();
  const userName = session!.user!.name || "User";

  return <HomeClient userName={userName} />;
}
