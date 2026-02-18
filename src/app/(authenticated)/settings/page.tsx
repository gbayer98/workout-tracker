import { auth } from "@/lib/auth";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return <SettingsClient />;
}
