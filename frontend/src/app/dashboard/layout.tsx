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

  const userInfo = {
    id: user.id,
    name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    image: user.user_metadata?.avatar_url || null,
  };

  return (
    <DashboardLayoutClient userId={user.id} user={userInfo}>
      {children}
    </DashboardLayoutClient>
  );
}
