"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PieChart, MessageSquare, BarChart3, CreditCard, Database,
  Settings, HelpCircle, LogOut, Mic, Menu, X, ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useStore } from "@/lib/store-context";
import { apiFetch } from "@/lib/api";

const navItems = [
  { label: "Overview", icon: PieChart, href: "/dashboard" },
  { label: "Conversations", icon: MessageSquare, href: "/dashboard/conversations" },
  { label: "Knowledge Base", icon: Database, href: "/dashboard/knowledge-base" },
  { label: "Agent Config", icon: Mic, href: "/dashboard/agent-config" },
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
  const { storeId } = useStore();
  const [usage, setUsage] = useState<{ minutes_used: number; minutes_limit: number; tier: string; is_trial_expired: boolean } | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!storeId) return;
    apiFetch(`/api/stores/${storeId}/subscription`)
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setUsage({
        minutes_used: data.minutes_used,
        minutes_limit: data.minutes_limit,
        tier: data.tier,
        is_trial_expired: data.is_trial_expired,
      }))
      .catch(() => {});
  }, [storeId]);

  return (
    <div className="min-h-screen flex bg-canvas text-body" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] bg-gradient-to-b from-panel to-canvas border-r border-edge flex flex-col py-5 px-3 shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 mb-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center shadow-lg shadow-primary/25">
              <Mic className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-heading tracking-tight">SimplifyOps</p>
              <p className="text-[10px] text-faint tracking-wide uppercase">Dashboard</p>
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

        {/* Usage warning */}
        {usage && (usage.minutes_used / usage.minutes_limit > 0.7 || usage.is_trial_expired) && (
          <Link href="/dashboard/billing" className="block mx-3 mb-3 p-3 rounded-xl border border-warning/30 bg-warning/5">
            {usage.is_trial_expired ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <p className="text-xs text-warning font-medium">Trial expired -- choose a plan</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-warning font-medium mb-1">
                  {Math.round(usage.minutes_used / usage.minutes_limit * 100)}% usage
                </p>
                <div className="w-full bg-canvas rounded-full h-1.5">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, usage.minutes_used / usage.minutes_limit * 100)}%` }} />
                </div>
              </>
            )}
          </Link>
        )}

        {/* Main nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-1">
          <p className="text-[10px] font-semibold text-faint uppercase tracking-widest px-3 mb-2">Menu</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "text-muted hover:text-heading hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <item.icon className={`w-[18px] h-[18px] ${isActive ? "text-primary" : "text-faint group-hover:text-muted"}`} />
                {item.label}
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-primary/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="flex flex-col gap-0.5 border-t border-edge pt-3 mt-3 px-1">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-heading hover:bg-white/[0.04]"
                }`}
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={async () => {
              const supabase = createSupabaseBrowser();
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-error hover:bg-error/5 transition-all cursor-pointer"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Sign Out
          </button>
        </div>

        {/* User card */}
        <div className="border-t border-edge pt-4 mt-3 mx-1">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/[0.03] border border-edge">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate text-heading">{user.name || "User"}</p>
              <p className="text-[10px] text-faint truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-canvas/95 backdrop-blur-sm border-b border-edge">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-heading" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-400 flex items-center justify-center">
              <Mic className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-heading tracking-tight">SimplifyOps</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
