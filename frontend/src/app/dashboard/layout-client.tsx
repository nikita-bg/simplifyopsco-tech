"use client";

import { StoreProvider, useStore } from "@/lib/store-context";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Onboarding } from "@/components/Onboarding";
import { Loader2 } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

function DashboardShell({
  user,
  children,
}: {
  user: UserInfo;
  children: React.ReactNode;
}) {
  const { hasStore, loading } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasStore) {
    return <Onboarding userId={user.id} />;
  }

  return (
    <DashboardSidebar user={user}>
      {children}
    </DashboardSidebar>
  );
}

export function DashboardLayoutClient({
  userId,
  user,
  children,
}: {
  userId: string;
  user: UserInfo;
  children: React.ReactNode;
}) {
  return (
    <StoreProvider userId={userId}>
      <DashboardShell user={user}>
        {children}
      </DashboardShell>
    </StoreProvider>
  );
}
