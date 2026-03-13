"use client";

import React from "react";
import { useStore } from "@/lib/store-context";
import { ClientDashboard } from "./ClientDashboard";

export function DashboardContent() {
  const { storeId } = useStore();

  return <ClientDashboard storeId={storeId!} />;
}
