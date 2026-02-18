import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import MovementClient from "./movement-client";

export default async function MovementPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <MovementClient />;
}
