export const dynamic = "force-dynamic";

import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayoutClient } from "./layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return (
    <DashboardLayoutClient userId={user.id}>
      {children}
    </DashboardLayoutClient>
  );
}
