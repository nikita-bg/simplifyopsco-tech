"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PieChart, MessageSquare, BarChart3, Database,
  Settings, HelpCircle, LogOut, Mic, Menu, X,
  AlertTriangle, CreditCard, MoreHorizontal
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { storeId } = useStore();
  const [usage, setUsage] = useState<{ minutes_used: number; minutes_limit: number; tier: string; is_trial_expired: boolean } | null>(null);

  useEffect(() => {
    const handlePathnameChange = () => {
      setSidebarOpen(false);
      setProfileMenuOpen(false);
    };
    handlePathnameChange();
  }, [pathname]);

  // Click outside listener for profile menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <div className="min-h-screen flex bg-canvas text-body">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[240px] bg-panel border-r border-edge flex flex-col pt-5 pb-3 px-3 shrink-0 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-2 mb-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Mic className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-heading tracking-tight">SimplifyOps</span>
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
          <Link href="/dashboard/billing" className="block mx-1 mb-4 p-3 rounded-lg border border-warning/10 bg-warning/5 transition-colors hover:bg-warning/10">
            {usage.is_trial_expired ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                <p className="text-xs text-warning font-medium">Trial expired</p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1.5">
                    <p className="text-[11px] text-muted font-medium">Usage Limit</p>
                    <p className="text-[11px] text-warning font-semibold">
                      {Math.round(usage.minutes_used / usage.minutes_limit * 100)}%
                    </p>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${Math.min(100, usage.minutes_used / usage.minutes_limit * 100)}%` }} />
                </div>
              </>
            )}
          </Link>
        )}

        {/* Main nav */}
        <nav className="flex-1 flex flex-col gap-0.5 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group flex items-center justify-between px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  isActive
                    ? "bg-white/5 text-heading shadow-[inset_2px_0_0_0_var(--color-primary)]"
                    : "text-muted hover:text-heading hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 opacity-70" />
                    {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Card / Popover */}
        <div className="relative mt-auto" ref={profileMenuRef}>
            {profileMenuOpen && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 w-full bg-raised border border-edge rounded-lg shadow-xl overflow-hidden py-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="px-3 pt-2 pb-3 mb-1 border-b border-edge">
                        <p className="text-[13px] font-medium text-heading truncate">{user.name || "User"}</p>
                        <p className="text-[11px] text-muted truncate">{user.email}</p>
                    </div>
                    <div className="flex flex-col">
                        <Link href="/dashboard/settings" className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-muted hover:text-heading hover:bg-white/5 transition-colors">
                            <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <Link href="/dashboard/billing" className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-muted hover:text-heading hover:bg-white/5 transition-colors">
                            <CreditCard className="w-4 h-4" /> Billing
                        </Link>
                        <a href="mailto:hello@simplifyopsco.tech" className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-muted hover:text-heading hover:bg-white/5 transition-colors">
                            <HelpCircle className="w-4 h-4" /> Support
                        </a>
                    </div>
                    <div className="border-t border-edge mt-1 pt-1">
                        <button
                            onClick={async () => {
                                const supabase = createSupabaseBrowser();
                                await supabase.auth.signOut();
                                window.location.href = "/";
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-error/80 hover:text-error hover:bg-error/10 transition-colors text-left"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </div>
            )}
            
            <button 
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md transition-colors text-left flex-shrink-0 border border-transparent ${
                    profileMenuOpen ? "bg-white/5 border-edge" : "hover:bg-white/[0.04]"
                }`}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate text-heading leading-tight">{user.name || "User"}</p>
                    </div>
                </div>
                <MoreHorizontal className="w-4 h-4 text-muted shrink-0" />
            </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto bg-canvas">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-panel/95 backdrop-blur-sm border-b border-edge">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-heading" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Mic className="w-3 h-3 text-primary" />
            </div>
            <span className="text-sm font-bold text-heading tracking-tight">SimplifyOps</span>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

