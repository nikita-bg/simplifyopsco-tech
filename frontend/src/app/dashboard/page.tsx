export const dynamic = "force-dynamic";

import { getAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/DashboardContent";

export default async function DashboardPage() {
  const { data: session } = await getAuth().getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return <DashboardContent user={session.user} />;
}
