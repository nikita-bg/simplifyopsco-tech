"use client";

import React from "react";
import { useStore } from "@/lib/store-context";
import { ClientDashboard } from "./ClientDashboard";
import { Onboarding } from "./Onboarding";
import { Loader2 } from "lucide-react";

interface UserInfo {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

export function DashboardContent({ user }: { user: UserInfo }) {
  const { storeId, hasStore, loading } = useStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a14]">
        <Loader2 className="w-8 h-8 animate-spin text-[#256af4]" />
      </div>
    );
  }

  if (!hasStore) {
    return <Onboarding userId={user.id} />;
  }

  return <ClientDashboard user={user} storeId={storeId!} />;
}
