"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PieChart, MessageSquare, BarChart3, CreditCard,
  Settings, HelpCircle, LogOut, Mic, Menu, X,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const navItems = [
  { label: "Overview", icon: PieChart, href: "/dashboard" },
  { label: "Conversations", icon: MessageSquare, href: "/dashboard/conversations" },
  { label: "Reports", icon: BarChart3, href: "/dashboard/reports" },
  { label: "Billing", icon: CreditCard, href: "/dashboard/billing" },
];

const bottomNav = [
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
  { label: "Support", icon: HelpCircle, href: "mailto:hello@simplifyopsco.tech" },
];

interface UserInfo {
  name: string;
  email: string;
  image?: string | null;
}

export function DashboardSidebar({
  user,
  children,
}: {
  user: UserInfo;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex bg-canvas text-body" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-panel border-r border-white/5 flex flex-col py-6 px-4 shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-2 mb-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-heading">SimplifyOps</p>
              <p className="text-[10px] text-faint">Dashboard</p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* Main nav */}
        <div className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-muted hover:text-heading hover:bg-white/5"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Bottom nav */}
        <div className="flex flex-col gap-1 border-t border-white/5 pt-4 mt-4">
          {bottomNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-heading hover:bg-white/5 transition-all"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          <button
            onClick={async () => {
              const supabase = createSupabaseBrowser();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-error hover:bg-error/5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* User card */}
        <div className="border-t border-white/5 pt-4 mt-4 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-white">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-heading">{user.name || "User"}</p>
              <p className="text-[10px] text-faint truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-canvas/95 backdrop-blur-sm border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-heading" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Mic className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-heading">SimplifyOps</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
