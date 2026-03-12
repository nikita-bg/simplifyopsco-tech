"use client";

import { StoreProvider } from "@/lib/store-context";

export function DashboardLayoutClient({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  return <StoreProvider userId={userId}>{children}</StoreProvider>;
}
