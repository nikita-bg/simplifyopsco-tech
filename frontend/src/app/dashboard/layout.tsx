export const dynamic = "force-dynamic";

import { getAuth } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await getAuth().getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <DashboardLayoutClient userId={session.user.id}>
      {children}
    </DashboardLayoutClient>
  );
}
